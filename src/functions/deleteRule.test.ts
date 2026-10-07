import {
  createAmountRule,
  createAmountRuleSplit,
  createCategory,
  createVendorAlias,
  createVendorRule,
} from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { deleteRule } from "./deleteRule.ts";

describe("deleteRule", () => {
  const prisma = getPrisma();
  const externalVendor = "CHIPOTLE 1234";

  it("deletes an amount rule and its splits, leaving the vendor's other rows", async () => {
    const category = await createCategory();
    const [amountRule] = await Promise.all([
      createAmountRule({ externalVendor, amount: -1245 }),
      createVendorAlias({ externalVendor, vendor: "Chipotle" }),
      createVendorRule({ externalVendor }),
    ]);
    await createAmountRuleSplit({
      amountRule: { connect: { id: amountRule.id } },
      category: { connect: { id: category.id } },
    });

    await deleteRule({ data: { scope: "amount", id: amountRule.id } });

    expect(await prisma.amountRule.count({ where: { externalVendor } })).toBe(0);
    expect(await prisma.amountRuleSplit.count({ where: { amountRuleId: amountRule.id } })).toBe(0);
    expect(await prisma.vendorAlias.findUnique({ where: { externalVendor } })).not.toBeNull();
    expect(await prisma.vendorRule.findUnique({ where: { externalVendor } })).not.toBeNull();
  });

  it("keeps the vendor's other amount rules", async () => {
    const [target] = await Promise.all([
      createAmountRule({ externalVendor, amount: -1245 }),
      createAmountRule({ externalVendor, amount: -4000 }),
    ]);

    await deleteRule({ data: { scope: "amount", id: target.id } });

    const remaining = await prisma.amountRule.findMany({ where: { externalVendor } });
    expect(remaining.map(({ amount }) => amount)).toEqual([-4000]);
  });

  it("deletes everything stored for a vendor", async () => {
    await Promise.all([
      createVendorAlias({ externalVendor, vendor: "Chipotle" }),
      createVendorRule({ externalVendor }),
      createAmountRule({ externalVendor, amount: -1245 }),
      createAmountRule({ externalVendor, amount: -4000 }),
    ]);

    await deleteRule({ data: { scope: "vendor", externalVendor } });

    expect(await prisma.vendorAlias.findUnique({ where: { externalVendor } })).toBeNull();
    expect(await prisma.vendorRule.findUnique({ where: { externalVendor } })).toBeNull();
    expect(await prisma.amountRule.count({ where: { externalVendor } })).toBe(0);
  });

  it("leaves other vendors alone", async () => {
    await Promise.all([
      createVendorAlias({ externalVendor, vendor: "Chipotle" }),
      createVendorAlias({ externalVendor: "OTHER", vendor: "Other" }),
    ]);

    await deleteRule({ data: { scope: "vendor", externalVendor } });

    expect(await prisma.vendorAlias.count()).toBe(1);
  });
});
