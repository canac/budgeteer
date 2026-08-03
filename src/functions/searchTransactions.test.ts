import {
  createCategory,
  createExternalAccount,
  createExternalTransaction,
  createTransaction,
  transaction,
} from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { pluck, range } from "~/lib/collections";
import { searchTransactions } from "./searchTransactions.ts";

describe("searchTransactions", () => {
  it("filters by date range inclusively", async () => {
    await Promise.all([
      createTransaction({ date: "2025-01-01", vendor: "Before" }),
      createTransaction({ date: "2025-02-15", vendor: "Inside" }),
      createTransaction({ date: "2025-03-31", vendor: "After" }),
    ]);

    const result = await searchTransactions({
      data: { pageSize: 10, fromDate: "2025-02-01", toDate: "2025-02-28" },
    });
    expect(pluck(result.transactions, "vendor")).toEqual(["Inside"]);
  });

  it("filters by exact vendor", async () => {
    await Promise.all([
      createTransaction({ vendor: "Costco" }),
      createTransaction({ vendor: "Costco Gas" }),
    ]);

    const result = await searchTransactions({ data: { pageSize: 10, vendor: "Costco" } });
    expect(pluck(result.transactions, "vendor")).toEqual(["Costco"]);
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

    const result = await searchTransactions({ data: { pageSize: 10, categoryId: category.id } });
    expect(pluck(result.transactions, "vendor")).toEqual(["Matched"]);
  });

  it("filters by external account", async () => {
    const [account, otherAccount] = await Promise.all([
      createExternalAccount(),
      createExternalAccount(),
    ]);

    await Promise.all([
      createExternalTransaction({
        account: { connect: { id: account.id } },
        transaction: { create: transaction({ vendor: "Matched" }) },
      }),
      createExternalTransaction({
        account: { connect: { id: otherAccount.id } },
        transaction: { create: transaction({ vendor: "OtherAccount" }) },
      }),
      createTransaction({ vendor: "Manual" }),
    ]);

    const result = await searchTransactions({ data: { pageSize: 10, accountId: account.id } });
    expect(pluck(result.transactions, "vendor")).toEqual(["Matched"]);
  });

  it("excludes balance adjustments when no type is given", async () => {
    await Promise.all([
      createTransaction({ vendor: "Normal", date: "2025-02-10" }),
      createTransaction({ vendor: "Adjustment", date: "2025-02-11", type: "BALANCE_ADJUSTMENT" }),
    ]);

    const result = await searchTransactions({
      data: { pageSize: 10, fromDate: "2025-02-01", toDate: "2025-02-28" },
    });
    expect(pluck(result.transactions, "vendor")).toEqual(["Normal"]);
  });

  it("filters by balance adjustment type", async () => {
    await Promise.all([
      createTransaction({ vendor: "Normal" }),
      createTransaction({ vendor: "Adjustment", type: "BALANCE_ADJUSTMENT" }),
    ]);

    const result = await searchTransactions({
      data: { pageSize: 10, type: "BALANCE_ADJUSTMENT" },
    });
    expect(pluck(result.transactions, "vendor")).toEqual(["Adjustment"]);
  });

  it("filters by transfer type", async () => {
    await Promise.all([
      createTransaction({ vendor: "Normal" }),
      createTransaction({ vendor: "Moved", type: "TRANSFER" }),
    ]);

    const result = await searchTransactions({ data: { pageSize: 10, type: "TRANSFER" } });
    expect(pluck(result.transactions, "vendor")).toEqual(["Moved"]);
  });

  it("filters by transaction type", async () => {
    await Promise.all([
      createTransaction({ vendor: "Normal" }),
      createTransaction({ vendor: "Moved", type: "TRANSFER" }),
      createTransaction({ vendor: "Adjustment", type: "BALANCE_ADJUSTMENT" }),
    ]);

    const result = await searchTransactions({ data: { pageSize: 10, type: "TRANSACTION" } });
    expect(pluck(result.transactions, "vendor")).toEqual(["Normal"]);
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
      createTransaction({
        vendor: "Chipotle",
        date: "2025-02-14",
        type: "TRANSFER",
        transactionCategories: { create: [{ amount: -100, categoryId: category.id }] },
      }),
    ]);

    const result = await searchTransactions({
      data: {
        pageSize: 10,
        vendor: "Chipotle",
        categoryId: category.id,
        fromDate: "2025-02-01",
        toDate: "2025-02-28",
        type: "TRANSACTION",
      },
    });

    expect(pluck(result.transactions, "date")).toEqual(["2025-02-10"]);
  });

  it("orders by date descending", async () => {
    await Promise.all([
      createTransaction({ date: "2025-02-01", vendor: "Old" }),
      createTransaction({ date: "2025-02-20", vendor: "New" }),
      createTransaction({ date: "2025-02-10", vendor: "Mid" }),
    ]);

    const result = await searchTransactions({
      data: { pageSize: 10, fromDate: "2025-02-01", toDate: "2025-02-28" },
    });
    expect(pluck(result.transactions, "vendor")).toEqual(["New", "Mid", "Old"]);
  });

  it("returns the total count alongside the page of transactions", async () => {
    await Promise.all(
      range(5).map((i) => createTransaction({ date: `2025-02-0${i + 1}`, vendor: "Costco" })),
    );

    const result = await searchTransactions({ data: { pageSize: 2, vendor: "Costco" } });

    expect(result.total).toBe(5);
    expect(result.transactions).toHaveLength(2);
  });

  it("paginates", async () => {
    await Promise.all(
      range(5).map((i) => createTransaction({ date: `2025-02-0${i + 1}`, vendor: `V${i}` })),
    );

    const [page1, page2, page3] = await Promise.all([
      searchTransactions({ data: { page: 1, pageSize: 2, fromDate: "2025-02-01" } }),
      searchTransactions({ data: { page: 2, pageSize: 2, fromDate: "2025-02-01" } }),
      searchTransactions({ data: { page: 3, pageSize: 2, fromDate: "2025-02-01" } }),
    ]);

    expect(page1.total).toBe(5);
    expect(pluck(page1.transactions, "vendor")).toEqual(["V4", "V3"]);
    expect(pluck(page2.transactions, "vendor")).toEqual(["V2", "V1"]);
    expect(pluck(page3.transactions, "vendor")).toEqual(["V0"]);
  });

  it("throws when no filter is provided", async () => {
    await expect(searchTransactions({ data: { pageSize: 10 } })).rejects.toThrow(
      "At least one filter is required",
    );
  });
});
