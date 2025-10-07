import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { find } from "~/lib/collections";
import { prisma } from "~/lib/prisma";

export const getCategoriesWithBalances = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const [categories, budgets, transactions] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.budgetCategory.groupBy({
        by: ["categoryId"],
        _sum: { budgetedAmount: true },
      }),
      prisma.transactionCategory.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
      }),
    ]);

    return categories.map((category) => {
      const totalBudgeted = find(budgets, "categoryId", category.id)?._sum.budgetedAmount ?? 0;
      const totalSpent = find(transactions, "categoryId", category.id)?._sum.amount ?? 0;
      return {
        ...category,
        balance: totalBudgeted + totalSpent,
      };
    });
  });
