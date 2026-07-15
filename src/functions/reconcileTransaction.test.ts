import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createCategory, createExternalTransaction, transaction } from "../../test/mocks.ts";
import { reconcileTransaction } from "./reconcileTransaction.ts";

describe("reconcileTransaction", () => {
  const prisma = getPrisma();

  it("reconciles a single-category transaction to the new bank amount and date", async () => {
    const category = await createCategory();
    const external = await createExternalTransaction({
      amount: -2000,
      date: "2026-05-02",
      changedAt: new Date(),
      reviewed: true,
      transaction: {
        create: {
          ...transaction({ amount: -1000, date: "2026-04-01", vendor: "Groceries" }),
          transactionCategories: { create: [{ categoryId: category.id, amount: -1000 }] },
        },
      },
    });

    const updated = await reconcileTransaction({ data: { id: external.id } });

    expect(updated.amount).toBe(-2000);
    expect(updated.date).toBe("2026-05-02");
    expect(updated.vendor).toBe("Groceries");
    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId: updated.id },
    });
    expect(categories).toMatchObject([{ categoryId: category.id, amount: -2000 }]);
    const refreshed = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(refreshed.changedAt).toBeNull();
  });

  it("reconciles a split transaction with explicit category amounts", async () => {
    const [category1, category2] = await Promise.all([createCategory(), createCategory()]);
    const external = await createExternalTransaction({
      amount: -1200,
      date: "2026-05-02",
      changedAt: new Date(),
      reviewed: true,
      transaction: {
        create: {
          ...transaction({ amount: -1000 }),
          transactionCategories: {
            create: [
              { categoryId: category1.id, amount: -700 },
              { categoryId: category2.id, amount: -300 },
            ],
          },
        },
      },
    });

    const updated = await reconcileTransaction({
      data: {
        id: external.id,
        categories: [
          { categoryId: category1.id, amount: -800 },
          { categoryId: category2.id, amount: -400 },
        ],
      },
    });

    expect(updated.amount).toBe(-1200);
    const categories = await prisma.transactionCategory.findMany({
      where: { transactionId: updated.id },
      orderBy: { amount: "asc" },
    });
    expect(
      categories.map((category) => ({ categoryId: category.categoryId, amount: category.amount })),
    ).toEqual([
      { categoryId: category1.id, amount: -800 },
      { categoryId: category2.id, amount: -400 },
    ]);
    const refreshed = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id: external.id },
    });
    expect(refreshed.changedAt).toBeNull();
  });

  it("requires explicit categories for a split transaction", async () => {
    const [category1, category2] = await Promise.all([createCategory(), createCategory()]);
    const external = await createExternalTransaction({
      amount: -1200,
      changedAt: new Date(),
      reviewed: true,
      transaction: {
        create: {
          ...transaction({ amount: -1000 }),
          transactionCategories: {
            create: [
              { categoryId: category1.id, amount: -700 },
              { categoryId: category2.id, amount: -300 },
            ],
          },
        },
      },
    });

    await expect(reconcileTransaction({ data: { id: external.id } })).rejects.toThrow(/split/i);
  });

  it("rejects category amounts that don't sum to the new amount", async () => {
    const category = await createCategory();
    const external = await createExternalTransaction({
      amount: -2000,
      changedAt: new Date(),
      reviewed: true,
      transaction: {
        create: {
          ...transaction({ amount: -1000 }),
          transactionCategories: { create: [{ categoryId: category.id, amount: -1000 }] },
        },
      },
    });

    await expect(
      reconcileTransaction({
        data: { id: external.id, categories: [{ categoryId: category.id, amount: -1500 }] },
      }),
    ).rejects.toThrow(/sum to transaction amount/);
  });

  it("rejects reconciling a transaction that was not changed at the bank", async () => {
    const category = await createCategory();
    const external = await createExternalTransaction({
      amount: -1000,
      reviewed: true,
      transaction: {
        create: {
          ...transaction({ amount: -1000 }),
          transactionCategories: { create: [{ categoryId: category.id, amount: -1000 }] },
        },
      },
    });

    await expect(reconcileTransaction({ data: { id: external.id } })).rejects.toThrow(/changed/i);
  });
});
