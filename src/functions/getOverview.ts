import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { getDaysInMonth, parseISO } from "date-fns";
import type { BudgetInclude } from "generated/prisma/models";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateBalances } from "~/lib/calculateBalance";
import { toISOMonthString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";

/**
 * Find the current month's budget, creating it if necessary.
 */
export const getCurrentBudget = createServerOnlyFn(async () => {
  const month = toISOMonthString(new Date());
  const include = {
    budgetCategories: {
      orderBy: { category: { name: "asc" } },
      include: { category: true },
    },
  } satisfies BudgetInclude;

  // Find the most recent budget
  const budget = await prisma.budget.findFirst({
    where: {
      month: { lte: month },
    },
    orderBy: { month: "desc" },
    include,
  });

  // This is the current month's budget, so return it
  if (budget?.month === month) {
    return budget;
  }

  // Clone the existing budget if any
  return prisma.budget.create({
    data: {
      month,
      income: budget?.income ?? 0,
      budgetCategories: {
        create: budget?.budgetCategories.map(({ categoryId, budgetedAmount }) => ({
          categoryId,
          budgetedAmount,
        })),
      },
    },
    include,
  });
});

export const getOverview = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const budget = await getCurrentBudget();
    const budgetCategories = await calculateBalances(
      budget.budgetCategories.filter(
        (budgetCategory) =>
          budgetCategory.category.type === "ACCUMULATING" ||
          budgetCategory.category.type === "NON_ACCUMULATING",
      ),
      parseISO(budget.month),
    );

    const totalSpent = budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.spent,
      0,
    );
    const totalBudgeted = budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.budgeted,
      0,
    );

    const now = new Date();
    const totalDaysInMonth = getDaysInMonth(now);
    const dayOfMonth = now.getDate();
    const monthProgressionPercentage = dayOfMonth / totalDaysInMonth;

    return {
      month: budget.month,
      totalSpent,
      totalBudgeted,
      monthProgressionPercentage,
      categories: budgetCategories,
      income: budget.income,
    };
  });
