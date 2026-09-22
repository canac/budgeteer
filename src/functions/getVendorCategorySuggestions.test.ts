import { createCategory, createTransaction } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getVendorCategorySuggestions } from "./getVendorCategorySuggestions.ts";

describe("getVendorCategorySuggestions", () => {
  let gasId: string;
  let groceriesId: string;
  let diningId: string;
  let travelId: string;

  beforeEach(async () => {
    const [gas, groceries, dining, travel] = await Promise.all([
      createCategory({ name: "Gas" }),
      createCategory({ name: "Groceries" }),
      createCategory({ name: "Dining" }),
      createCategory({ name: "Travel" }),
    ]);
    gasId = gas.id;
    groceriesId = groceries.id;
    diningId = dining.id;
    travelId = travel.id;
  });

  const spend = (
    vendor: string,
    date: string,
    categoryIds: string[],
    type?: "TRANSFER" | "BALANCE_ADJUSTMENT",
  ) =>
    createTransaction({
      vendor,
      date,
      amount: -1000 * categoryIds.length,
      ...(type && { type }),
      transactionCategories: {
        create: categoryIds.map((categoryId) => ({
          amount: -1000,
          category: { connect: { id: categoryId } },
        })),
      },
    });

  it("returns the newest distinct categories, newest first", async () => {
    await spend("Costco", "2026-07-01", [gasId]);
    await spend("Costco", "2026-08-01", [groceriesId]);
    await spend("Costco", "2026-09-01", [diningId]);

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([
      { categoryId: diningId, name: "Dining", date: "2026-09-01" },
      { categoryId: groceriesId, name: "Groceries", date: "2026-08-01" },
      { categoryId: gasId, name: "Gas", date: "2026-07-01" },
    ]);
  });

  it("scans past repeated categories to find distinct ones", async () => {
    await spend("Costco", "2026-06-01", [groceriesId]);
    await spend("Costco", "2026-07-01", [gasId]);
    await spend("Costco", "2026-08-01", [gasId]);
    await spend("Costco", "2026-09-01", [gasId]);

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([
      { categoryId: gasId, name: "Gas", date: "2026-09-01" },
      { categoryId: groceriesId, name: "Groceries", date: "2026-06-01" },
    ]);
  });

  it("caps the result at three categories", async () => {
    await spend("Costco", "2026-06-01", [travelId]);
    await spend("Costco", "2026-07-01", [gasId]);
    await spend("Costco", "2026-08-01", [groceriesId]);
    await spend("Costco", "2026-09-01", [diningId]);

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([
      { categoryId: diningId, name: "Dining", date: "2026-09-01" },
      { categoryId: groceriesId, name: "Groceries", date: "2026-08-01" },
      { categoryId: gasId, name: "Gas", date: "2026-07-01" },
    ]);
  });

  it("returns every category of a split transaction", async () => {
    await spend("Costco", "2026-09-01", [gasId, groceriesId]);

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([
      { categoryId: gasId, name: "Gas", date: "2026-09-01" },
      { categoryId: groceriesId, name: "Groceries", date: "2026-09-01" },
    ]);
  });

  it("returns a lone category without gating on the count", async () => {
    await spend("Costco", "2026-09-01", [gasId]);

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([
      { categoryId: gasId, name: "Gas", date: "2026-09-01" },
    ]);
  });

  it("ignores other vendors", async () => {
    await spend("Shell", "2026-09-01", [gasId]);

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([]);
  });

  it("ignores transfers and balance adjustments", async () => {
    await spend("Costco", "2026-09-01", [gasId], "BALANCE_ADJUSTMENT");
    await spend("Costco", "2026-08-01", [groceriesId], "TRANSFER");

    expect(await getVendorCategorySuggestions({ data: { vendor: "Costco" } })).toEqual([]);
  });

  it("returns nothing for a vendor with no history", async () => {
    expect(await getVendorCategorySuggestions({ data: { vendor: "Nowhere" } })).toEqual([]);
  });
});
