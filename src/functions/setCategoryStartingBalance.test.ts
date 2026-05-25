import { pluck } from "src/lib/collections.ts";
import { createBudget, createCategory, createTransaction } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Budget, Category } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { setCategoryStartingBalance } from "./setCategoryStartingBalance.ts";

describe("setCategoryStartingBalance", () => {
  const prisma = getPrisma();

  const month = "2025-02";
  const prevMonth = "2025-01";
  let categoryId: string;
  beforeEach(async () => {
    const [prevBudget, budget, category]: [Budget, Budget, Category] = await Promise.all([
      createBudget({ month: prevMonth }),
      createBudget({ month }),
      createCategory({ createdMonth: prevMonth, type: "ACCUMULATING" }),
    ]);
    categoryId = category.id;
    await Promise.all([
      prisma.budgetCategory.createMany({
        data: [
          { budgetedAmount: 400, categoryId, budgetId: prevBudget.id },
          { budgetedAmount: 500, categoryId, budgetId: budget.id },
        ],
      }),
      createTransaction({
        amount: -100,
        date: "2025-01-10",
        transactionCategories: { create: { amount: -100, categoryId } },
      }),
      createTransaction({
        amount: -200,
        date: "2025-01-20",
        transactionCategories: { create: { amount: -200, categoryId } },
      }),
    ]);
  });

  it("creates a new balance adjustment when none exists", async () => {
    await setCategoryStartingBalance({ data: { categoryId, month, targetBalance: 400 } });

    const adjustment = await prisma.transaction.findFirst({
      where: { type: "BALANCE_ADJUSTMENT" },
    });
    expect(adjustment).toMatchObject({ amount: 300, date: "2025-02-01" });
  });

  it("updates existing balance adjustment", async () => {
    const existing = await prisma.transaction.create({
      data: {
        type: "BALANCE_ADJUSTMENT",
        amount: 300,
        date: "2025-02-01",
        vendor: "Balance Adjustment",
        transactionCategories: { create: { amount: 300, categoryId } },
      },
    });

    await setCategoryStartingBalance({ data: { categoryId, month, targetBalance: 400 } });

    const updated = await prisma.transaction.findUniqueOrThrow({
      where: { id: existing.id },
      include: { transactionCategories: true },
    });
    expect(updated.amount).toBe(600);
    expect(pluck(updated.transactionCategories, "amount")).toEqual([600]);
  });

  it("deletes existing adjustment when new total is zero", async () => {
    const existing = await prisma.transaction.create({
      data: {
        type: "BALANCE_ADJUSTMENT",
        amount: 300,
        date: "2025-02-01",
        vendor: "Balance Adjustment",
        transactionCategories: { create: { amount: 300, categoryId } },
      },
    });

    await setCategoryStartingBalance({ data: { categoryId, month, targetBalance: -200 } });

    const deleted = await prisma.transaction.findUnique({ where: { id: existing.id } });
    expect(deleted).toBeNull();
  });

  it("does nothing when target already matches current balance", async () => {
    await setCategoryStartingBalance({ data: { categoryId, month, targetBalance: 100 } });

    const count = await prisma.transaction.count({ where: { type: "BALANCE_ADJUSTMENT" } });
    expect(count).toBe(0);
  });

  it("throws when category is non-accumulating", async () => {
    const nonAccumulating = await createCategory({
      createdMonth: prevMonth,
      type: "NON_ACCUMULATING",
    });

    await expect(
      setCategoryStartingBalance({
        data: { categoryId: nonAccumulating.id, month, targetBalance: 500 },
      }),
    ).rejects.toThrow("No record was found for a query");
  });
});
