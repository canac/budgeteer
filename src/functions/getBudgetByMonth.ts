import { createServerFn } from "@tanstack/react-start";
import { object } from "zod";
import { calculateCategoryBalance } from "~/lib/calculateFundBalance";
import { prisma } from "~/lib/prisma";
import { month } from "~/lib/zod";

const inputSchema = object({
  month: month(),
});

export const getBudgetByMonth = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { month } }) => {
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
