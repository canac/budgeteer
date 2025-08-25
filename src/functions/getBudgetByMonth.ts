import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { calculateCategoryBalance } from "~/lib/calculateFundBalance";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
});

export const getBudgetByMonth = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { month } }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Error("Invalid month format");
    }
    const budget = await prisma.budget.findFirst({
      where: {
        month,
      },
      include: {
        budgetCategories: {
          orderBy: { id: "asc" },
          include: { category: true },
        },
      },
    });
    if (!budget) {
      throw new Response("Budget not found");
    }

    const totalBudgetedAmount = budget.budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.budgetedAmount,
      0,
    );

    return {
      ...budget,
      totalBudgetedAmount,
      budgetCategories: await Promise.all(
        budget.budgetCategories.map(async (budgetCategory) => ({
          ...budgetCategory,
          name: budgetCategory.category.name,
          balance: await calculateCategoryBalance({
            month,
            category: budgetCategory.category,
          }),
        })),
      ),
    };
  });
