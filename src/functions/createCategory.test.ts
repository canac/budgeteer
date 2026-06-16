import { beforeEach, describe, expect, it } from "vitest";
import type { Budget } from "~/prisma/client.ts";
import { getPrisma } from "../../test/helpers.ts";
import { createCategory } from "./createCategory.ts";

describe("createCategory", () => {
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
        accumulating: false,
        flexible: true,
        createdMonth: "2025-01",
        deletedMonth: null,
        sortOrder: 1,
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
          accumulating: true,
          flexible: true,
          budgetedAmount: 500,
        },
      });

      expect(category).toMatchObject({
        name: "Groceries",
        accumulating: true,
        flexible: true,
        createdMonth: "2025-01",
        deletedMonth: null,
        sortOrder: 1,
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

    it("increments sort order", async () => {
      await prisma.category.createMany({
        data: [1, 2, 3].map((sortOrder) => ({
          createdMonth: "2025-01",
          name: "Groceries",
          sortOrder,
        })),
      });

      const category = await createCategory({
        data: {
          month: "2025-01",
          name: "Groceries",
        },
      });

      expect(category.sortOrder).toBe(4);
    });

    it("fails when budget does not exist", async () => {
      await expect(() =>
        createCategory({
          data: {
            month: "2025-02",
            name: "Groceries",
          },
        }),
      ).rejects.toThrow("No record was found for a query");
    });
  });
});
