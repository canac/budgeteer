import { createCategory, createTransaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { pluck } from "~/lib/collections";
import { searchTransactions } from "./searchTransactions.ts";

describe("searchTransactions", () => {
  it("filters by date range inclusively", async () => {
    await Promise.all([
      createTransaction({ date: "2025-01-01", vendor: "Before" }),
      createTransaction({ date: "2025-02-15", vendor: "Inside" }),
      createTransaction({ date: "2025-03-31", vendor: "After" }),
    ]);

    const result = await searchTransactions({
      data: { fromDate: "2025-02-01", toDate: "2025-02-28" },
    });
    expect(pluck(result, "vendor")).toEqual(["Inside"]);
  });

  it("filters by exact vendor", async () => {
    await Promise.all([
      createTransaction({ vendor: "Costco" }),
      createTransaction({ vendor: "Costco Gas" }),
    ]);

    const result = await searchTransactions({ data: { vendor: "Costco" } });
    expect(pluck(result, "vendor")).toEqual(["Costco"]);
  });

  it("filters by category", async () => {
    const category = await createCategory({ name: "Groceries" });
    await Promise.all([
      createTransaction({
        vendor: "Matched",
        transactionCategories: { create: [{ amount: -100, categoryId: category.id }] },
      }),
      createTransaction({ vendor: "Unmatched" }),
    ]);

    const result = await searchTransactions({ data: { categoryId: category.id } });
    expect(pluck(result, "vendor")).toEqual(["Matched"]);
  });

  it("combines filters with AND", async () => {
    const category = await createCategory({ name: "Dining" });
    const withCategory = (vendor: string, date: string) =>
      createTransaction({
        vendor,
        date,
        transactionCategories: { create: [{ amount: -100, categoryId: category.id }] },
      });

    await Promise.all([
      withCategory("Chipotle", "2025-02-10"),
      withCategory("Chipotle", "2025-05-10"),
      createTransaction({ vendor: "Chipotle", date: "2025-02-12" }),
    ]);

    const result = await searchTransactions({
      data: {
        vendor: "Chipotle",
        categoryId: category.id,
        fromDate: "2025-02-01",
        toDate: "2025-02-28",
      },
    });

    expect(pluck(result, "date")).toEqual(["2025-02-10"]);
  });

  it("orders by date descending", async () => {
    await Promise.all([
      createTransaction({ date: "2025-02-01", vendor: "Old" }),
      createTransaction({ date: "2025-02-20", vendor: "New" }),
      createTransaction({ date: "2025-02-10", vendor: "Mid" }),
    ]);

    const result = await searchTransactions({
      data: { fromDate: "2025-02-01", toDate: "2025-02-28" },
    });
    expect(pluck(result, "vendor")).toEqual(["New", "Mid", "Old"]);
  });

  it("throws when no filter is provided", async () => {
    await expect(searchTransactions({ data: {} })).rejects.toThrow(
      "At least one filter is required",
    );
  });
});
