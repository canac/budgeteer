import type { Budget } from "generated/prisma/client.ts";
import { CategoryType } from "generated/prisma/enums";
import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createCategory } from "./createCategory.ts";

describe("createCategory", async () => {
  const prisma = getPrisma();

  describe("successful creation", () => {
    let budget: Budget;
    beforeEach(async () => {
      budget = await prisma.budget.create({
        data: { month: "2025-01", income: 0 },
      });
    });

    it("creates category linked to budget", async () => {
      const category = await createCategory({
        data: {
          month: "2025-01",
          name: "Groceries",
        },
      });

      expect(category).toMatchObject({
        name: "Groceries",
        type: CategoryType.NON_ACCUMULATING,
        createdMonth: "2025-01",
        deletedMonth: null,
      });

      const { budgetCategories } = await prisma.category.findFirstOrThrow({
        where: { id: category.id },
        include: { budgetCategories: true },
      });
      expect(budgetCategories[0]).toMatchObject({
        budgetId: budget.id,
        categoryId: category.id,
        budgetedAmount: 0,
      });
    });

    it("creates category with type and budgeted amount", async () => {
      const category = await createCategory({
        data: {
          month: "2025-01",
          name: "Groceries",
          type: CategoryType.ACCUMULATING,
          budgetedAmount: 500,
        },
      });

      expect(category).toMatchObject({
        name: "Groceries",
        type: CategoryType.ACCUMULATING,
        createdMonth: "2025-01",
        deletedMonth: null,
      });

      const { budgetCategories } = await prisma.category.findFirstOrThrow({
        where: { id: category.id },
        include: { budgetCategories: true },
      });
      expect(budgetCategories[0]).toMatchObject({
        budgetId: budget.id,
        categoryId: category.id,
        budgetedAmount: 500,
      });
    });

    it("fails when budget does not exist", async () => {
      await expect(() =>
        createCategory({
          data: {
            month: "2025-02",
            name: "Groceries",
          },
        }),
      ).rejects.toThrow();
    });
  });
});
