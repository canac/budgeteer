import { createBudget, createCategorizationRule, createCategory } from "test/mocks.ts";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { getCategoryHistory } from "./getCategoryHistory.ts";

describe("getCategoryHistory", () => {
  const prisma = getPrisma();

  let categoryId: string;
  beforeEach(async () => {
    const [budget, category] = await Promise.all([
      createBudget({ month: "2025-01" }),
      createCategory({ createdMonth: "2025-01" }),
    ]);
    categoryId = category.id;
    await prisma.budgetCategory.create({
      data: { budgetedAmount: 5000, categoryId, budgetId: budget.id },
    });
  });

  it("returns the history for a single-month range", async () => {
    const result = await getCategoryHistory({
      data: { categoryId, startMonth: "2025-01", endMonth: "2025-01" },
    });

    expect(result.category.id).toBe(categoryId);
    expect(result.startMonth).toBe("2025-01");
    expect(result.totalBudgeted).toBe(5000);
    expect(result.monthlyBreakdown).toHaveLength(1);
  });

  it("reports the category as deletable when nothing blocks deletion", async () => {
    const result = await getCategoryHistory({
      data: { categoryId, startMonth: "2025-01", endMonth: "2025-01" },
    });

    expect(result.deletable).toEqual({ valid: true });
  });

  it("reports the category as not deletable when a categorization rule references it", async () => {
    await createCategorizationRule({ category: { connect: { id: categoryId } } });

    const result = await getCategoryHistory({
      data: { categoryId, startMonth: "2025-01", endMonth: "2025-01" },
    });

    expect(result.deletable.valid).toBe(false);
  });
});
