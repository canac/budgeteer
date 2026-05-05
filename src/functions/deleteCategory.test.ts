import {
  createBudget,
  createCategorizationRule,
  createCategory,
  createTransaction,
} from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { deleteCategory } from "./deleteCategory.ts";

describe("deleteCategory", () => {
  const prisma = getPrisma();

  let categoryId: string;
  beforeEach(async () => {
    let jan, feb;
    [jan, feb, categoryId] = await Promise.all([
      createBudget({ month: "2025-01" }),
      createBudget({ month: "2025-02" }),
      createCategory({ createdMonth: "2025-01" }).then(({ id }) => id),
    ]);
    await prisma.budgetCategory.createMany({
      data: [
        { budgetedAmount: 100, categoryId, budgetId: jan.id },
        { budgetedAmount: 100, categoryId, budgetId: feb.id },
      ],
    });
  });

  it("sets deletedMonth and removes future budgetCategories", async () => {
    await deleteCategory({ data: { categoryId, month: "2025-02" } });

    const updated = await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
    expect(updated.deletedMonth).toBe("2025-02");

    const remaining = await prisma.budgetCategory.findMany({
      where: { categoryId },
      include: { budget: true },
    });
    expect(remaining.map((bc) => bc.budget.month)).toEqual(["2025-01"]);
  });

  it("rejects deletion when transactions exist in the current or future months", async () => {
    await createTransaction({
      amount: -100,
      date: "2025-02-15",
      transactionCategories: { create: { amount: -100, categoryId } },
    });

    await expect(() => deleteCategory({ data: { categoryId, month: "2025-02" } })).rejects.toThrow(
      /transactions in the current or future months/,
    );
  });

  it("rejects deletion when a categorization rule references the category", async () => {
    await createCategorizationRule({ category: { connect: { id: categoryId } } });

    await expect(() => deleteCategory({ data: { categoryId, month: "2025-02" } })).rejects.toThrow(
      /categorization rule/,
    );
  });
});
