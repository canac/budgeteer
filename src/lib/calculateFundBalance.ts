import { endOfMonth, parse, startOfMonth } from "date-fns";
import { prisma } from "~/lib/prisma";
import type { CategoryModel } from "../../generated/prisma/models";

export async function calculateCategoryBalance({
  month,
  category,
}: {
  month: string;
  category: Pick<CategoryModel, "id" | "fund">;
}): Promise<number> {
  const monthDate = parse(month, "MM-yyyy", new Date());
  const aggregateTransactions = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      categoryId: category.id,
      date: {
        gte: category.fund ? undefined : startOfMonth(monthDate),
        lte: endOfMonth(monthDate),
      },
    },
  });

  const aggregateBudgetCategories = await prisma.budgetCategory.aggregate({
    _sum: { budgetedAmount: true },
    where: {
      categoryId: category.id,
      budget: { month: category.fund ? { lte: month } : month },
    },
  });

  const balance =
    (aggregateBudgetCategories._sum.budgetedAmount ?? 0) +
    (aggregateTransactions._sum.amount ?? 0);
  return Math.round(balance * 100) / 100;
}
