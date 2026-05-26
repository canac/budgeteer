import { createBudget, createCategory, createTransaction } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Budget } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { getBudgetCategory } from "./getBudgetCategory.ts";

describe("getBudgetCategory", () => {
  const prisma = getPrisma();

  let jan: Budget;
  let categoryId: string;
  beforeEach(async () => {
    [jan, categoryId] = await Promise.all([
      createBudget({ month: "2025-01" }),
      createCategory({ createdMonth: "2025-01" }).then(({ id }) => id),
    ]);
    await prisma.budgetCategory.create({
      data: { budgetedAmount: 5000, categoryId, budgetId: jan.id },
    });
  });

  it("returns the category, its budgetCategory for the month, and transactions", async () => {
    await Promise.all([
      createTransaction({
        amount: -1000,
        date: "2025-01-15",
        transactionCategories: { create: { amount: -1000, categoryId } },
      }),
      createTransaction({
        amount: -500,
        date: "2025-01-20",
        transactionCategories: { create: { amount: -500, categoryId } },
      }),
      createTransaction({
        amount: -200,
        date: "2025-02-01",
        transactionCategories: { create: { amount: -200, categoryId } },
      }),
    ]);

    const result = await getBudgetCategory({ data: { month: "2025-01", categoryId } });

    expect(result.category.id).toBe(categoryId);
    expect(result.budgetCategory.budgetedAmount).toBe(5000);
    expect(result.transactionTotal).toBe(-1500);
    expect(result.transactions.map((t) => t.date)).toEqual(["2025-01-20", "2025-01-15"]);
    expect(result.deletable).toMatchObject({ valid: false });
  });

  it("returns deletable.valid=true when no transactions or rules block deletion", async () => {
    const result = await getBudgetCategory({ data: { month: "2025-01", categoryId } });

    expect(result.transactions).toEqual([]);
    expect(result.transactionTotal).toBe(0);
    expect(result.deletable).toEqual({ valid: true });
  });

  it("throws notFound when the category was deleted on or before the queried month", async () => {
    await prisma.category.update({
      where: { id: categoryId },
      data: { deletedMonth: "2025-01" },
    });

    await expect(() =>
      getBudgetCategory({ data: { month: "2025-01", categoryId } }),
    ).rejects.toMatchObject({ isNotFound: true });
  });
});
