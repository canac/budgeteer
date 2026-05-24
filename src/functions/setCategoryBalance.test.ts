import { createBudget, createCategory } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import type { Category } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { setCategoryBalance } from "./setCategoryBalance.ts";

describe("setCategoryBalance", () => {
  const prisma = getPrisma();

  const month = "2025-01";
  let categoryId: string;
  let category: Category;
  beforeEach(async () => {
    await createBudget({ month });
    category = await createCategory({ createdMonth: month });
    categoryId = category.id;
  });

  it("creates a new balance adjustment when none exists", async () => {
    await setCategoryBalance({ data: { categoryId, month, targetBalance: 500 } });

    const adjustment = await prisma.transaction.findFirst({
      where: { type: "BALANCE_ADJUSTMENT" },
    });
    expect(adjustment).toMatchObject({ amount: 500, date: "2025-01-01" });
  });

  it("updates existing balance adjustment", async () => {
    const existing = await prisma.transaction.create({
      data: {
        type: "BALANCE_ADJUSTMENT",
        amount: 300,
        date: "2025-01-01",
        vendor: "Balance Adjustment",
        transactionCategories: { create: { amount: 300, categoryId } },
      },
    });

    await setCategoryBalance({ data: { categoryId, month, targetBalance: 500 } });

    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: existing.id } });
    expect(updated.amount).toBe(500);
    const tc = await prisma.transactionCategory.findFirstOrThrow({
      where: { transactionId: existing.id },
    });
    expect(tc.amount).toBe(500);
  });

  it("deletes existing adjustment when new total is zero", async () => {
    const existing = await prisma.transaction.create({
      data: {
        type: "BALANCE_ADJUSTMENT",
        amount: 300,
        date: "2025-01-01",
        vendor: "Balance Adjustment",
        transactionCategories: { create: { amount: 300, categoryId } },
      },
    });

    await setCategoryBalance({ data: { categoryId, month, targetBalance: 0 } });

    const deleted = await prisma.transaction.findUnique({ where: { id: existing.id } });
    expect(deleted).toBeNull();
  });

  it("does nothing when target already matches current balance", async () => {
    await setCategoryBalance({ data: { categoryId, month, targetBalance: 0 } });

    const count = await prisma.transaction.count({ where: { type: "BALANCE_ADJUSTMENT" } });
    expect(count).toBe(0);
  });
});
