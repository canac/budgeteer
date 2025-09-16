import { createServerFn } from "@tanstack/react-start";
import { object } from "zod";
import { calculateCategoryBalance } from "~/lib/calculateFundBalance";
import { monthToString } from "~/lib/monthToString";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";
import { cloneBudget } from "./cloneBudget";

const inputSchema = object({
  month: monthDate(),
});

export const getBudgetByMonth = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { month } }) => {
    const monthString = monthToString(month);
    const budget =
      (await prisma.budget.findFirst({
        where: {
          month: monthString,
        },
        include: {
          budgetCategories: {
            orderBy: { id: "asc" },
            include: { category: true },
          },
        },
      })) ?? (await cloneBudget({ data: { month: monthString } }));
    if (!budget) {
      throw new Response("Budget not found");
    }

    const totalBudgetedAmount = budget.budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.budgetedAmount,
      0,
    );

    return {
      budget,
      month,
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
