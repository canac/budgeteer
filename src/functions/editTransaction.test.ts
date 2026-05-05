import { createBudget, createCategory, createTransaction as seedTransaction } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Transaction } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { editTransaction } from "./editTransaction.ts";

describe("editTransaction", () => {
  const prisma = getPrisma();

  let categoryId: string;
  let otherCategoryId: string;
  let tx: Transaction;
  beforeEach(async () => {
    [, categoryId, otherCategoryId] = await Promise.all([
      createBudget({ month: "2025-01" }),
      createCategory({ createdMonth: "2025-01" }).then(({ id }) => id),
      createCategory({ createdMonth: "2025-01" }).then(({ id }) => id),
    ]);
    tx = await seedTransaction({
      amount: -1000,
      date: "2025-01-15",
      vendor: "Costco",
      transactionCategories: { create: { amount: -1000, categoryId } },
    });
  });

  it("updates the transaction's basic attributes", async () => {
    await editTransaction({
      data: {
        id: tx.id,
        amount: -500,
        vendor: "Walmart",
        date: "2025-01-20",
        categories: [{ categoryId, amount: -500 }],
      },
    });

    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(updated).toMatchObject({ amount: -500, vendor: "Walmart", date: "2025-01-20" });
  });

  it("adds, updates, and removes categories", async () => {
    const third = await createCategory({ createdMonth: "2025-01" });
    await Promise.all([
      prisma.transactionCategory.create({
        data: { amount: -200, categoryId: otherCategoryId, transactionId: tx.id },
      }),
      prisma.transaction.update({ where: { id: tx.id }, data: { amount: -1200 } }),
    ]);

    await editTransaction({
      data: {
        id: tx.id,
        amount: -1500,
        vendor: "Costco",
        date: "2025-01-15",
        categories: [
          { categoryId, amount: -1000 },
          { categoryId: third.id, amount: -500 },
        ],
      },
    });

    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId: tx.id },
      orderBy: { amount: "desc" },
    });
    expect(categories).toMatchObject([
      { categoryId: third.id, amount: -500 },
      { categoryId, amount: -1000 },
    ]);
  });

  it("rejects changing date or amount on imported transactions", async () => {
    const imported = await seedTransaction({
      amount: -1000,
      date: "2025-01-15",
      tellerId: "teller_tx_1",
      transactionCategories: { create: { amount: -1000, categoryId } },
    });

    await expect(() =>
      editTransaction({
        data: {
          id: imported.id,
          amount: -2000,
          vendor: imported.vendor,
          date: "2025-01-15",
          categories: [{ categoryId, amount: -2000 }],
        },
      }),
    ).rejects.toThrow(/immutable/);

    await expect(() =>
      editTransaction({
        data: {
          id: imported.id,
          amount: -1000,
          vendor: imported.vendor,
          date: "2025-01-20",
          categories: [{ categoryId, amount: -1000 }],
        },
      }),
    ).rejects.toThrow(/immutable/);
  });

  it("allows editing vendor on imported transactions", async () => {
    const imported = await seedTransaction({
      amount: -1000,
      date: "2025-01-15",
      vendor: "Old",
      tellerId: "teller_tx_1",
      transactionCategories: { create: { amount: -1000, categoryId } },
    });

    await editTransaction({
      data: {
        id: imported.id,
        amount: -1000,
        vendor: "New",
        date: "2025-01-15",
        categories: [{ categoryId, amount: -1000 }],
      },
    });

    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: imported.id } });
    expect(updated.vendor).toBe("New");
  });

  it("rejects when transaction date precedes category creation", async () => {
    await createBudget({ month: "2024-12" });

    await expect(() =>
      editTransaction({
        data: {
          id: tx.id,
          amount: -1000,
          vendor: "Costco",
          date: "2024-12-15",
          categories: [{ categoryId, amount: -1000 }],
        },
      }),
    ).rejects.toThrow(/categories that don't exist/);
  });
});
