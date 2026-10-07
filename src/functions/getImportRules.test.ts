import { pluck } from "src/lib/collections.ts";
import {
  createAmountRule,
  createCategory,
  createVendorAlias,
  createVendorRule,
} from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getImportRules } from "./getImportRules.ts";

describe("getImportRules", () => {
  it("returns groups sorted by externalVendor", async () => {
    await Promise.all([
      createVendorAlias({ externalVendor: "VENDOR B", vendor: "B" }),
      createVendorRule({ externalVendor: "VENDOR A" }),
    ]);

    expect(pluck(await getImportRules(), "externalVendor")).toEqual(["VENDOR A", "VENDOR B"]);
  });

  it("groups the alias, the outcome and the amount rules of one vendor into one row", async () => {
    const category = await createCategory({ name: "Gas" });
    await Promise.all([
      createVendorAlias({ externalVendor: "COSTCO", vendor: "Costco" }),
      createVendorRule({ externalVendor: "COSTCO", category: { connect: { id: category.id } } }),
      createAmountRule({ externalVendor: "COSTCO", amount: -6000 }),
    ]);

    const groups = await getImportRules();
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      externalVendor: "COSTCO",
      vendorAlias: "Costco",
      vendorRule: { type: "categorize", splits: [{ category: { id: category.id, name: "Gas" } }] },
      amountRules: [{ amount: -6000 }],
    });
  });

  it("returns a group for a vendor that only has an amount rule", async () => {
    await createAmountRule({ externalVendor: "COSTCO", amount: -6000 });

    expect(await getImportRules()).toMatchObject([
      { externalVendor: "COSTCO", vendorAlias: null, vendorRule: null },
    ]);
  });

  it("returns a group for a vendor that only has an alias", async () => {
    await createVendorAlias({ externalVendor: "COSTCO", vendor: "Costco" });

    expect(await getImportRules()).toMatchObject([
      { externalVendor: "COSTCO", vendorAlias: "Costco", vendorRule: null, amountRules: [] },
    ]);
  });

  it("sorts amount rules by amount", async () => {
    const category = await createCategory({ name: "Gas" });
    await Promise.all([
      createAmountRule({
        externalVendor: "COSTCO",
        amount: -2500,
        splits: { create: [{ categoryId: category.id, amount: -2500 }] },
      }),
      createAmountRule({ externalVendor: "COSTCO", amount: -6000 }),
    ]);

    const [group] = await getImportRules();
    expect(group?.amountRules).toMatchObject([
      { amount: -6000, outcome: { type: "dismiss" } },
      {
        amount: -2500,
        outcome: { type: "categorize", splits: [{ category: { name: "Gas" }, amount: -2500 }] },
      },
    ]);
  });

  it("sorts each amount rule's splits by category name", async () => {
    const [snacks, groceries] = await Promise.all([
      createCategory({ name: "Snacks" }),
      createCategory({ name: "Groceries" }),
    ]);
    await createAmountRule({
      externalVendor: "COSTCO",
      amount: -6000,
      splits: {
        create: [
          { categoryId: snacks.id, amount: -1000 },
          { categoryId: groceries.id, amount: -5000 },
        ],
      },
    });

    const [group] = await getImportRules();
    expect(group?.amountRules[0]?.outcome).toMatchObject({
      splits: [{ category: { name: "Groceries" } }, { category: { name: "Snacks" } }],
    });
  });

  it("narrows each category to its id and name", async () => {
    const category = await createCategory({ name: "Gas" });
    await createVendorRule({
      externalVendor: "COSTCO",
      category: { connect: { id: category.id } },
    });

    const [group] = await getImportRules();
    expect(group?.vendorRule).toEqual({
      type: "categorize",
      splits: [{ category: { id: category.id, name: "Gas" } }],
    });
  });
});
