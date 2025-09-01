import { endOfMonth, parse, startOfMonth } from "date-fns";
import { prisma } from "~/lib/prisma";
import { roundCurrency } from "~/lib/roundCurrency";
import type { CategoryModel } from "../../generated/prisma/models";

async function getTotalBudgetedAmount({
  month,
  category,
}: {
  month: string;
  category: Pick<CategoryModel, "id" | "fund">;
}): Promise<number> {
  const aggregateBudgetCategories = await prisma.budgetCategory.aggregate({
    _sum: { budgetedAmount: true },
    where: {
      categoryId: category.id,
      budget: { month: category.fund ? { lte: month } : month },
    },
  });
  return aggregateBudgetCategories._sum.budgetedAmount ?? 0;
}

export async function calculateCategoryBalance({
  month,
  category,
}: {
  month: string;
  category: Pick<CategoryModel, "id" | "fund">;
}): Promise<number> {
  const monthDate = parse(month, "MM-yyyy", new Date());

  const aggregateTransactions = await prisma.transactionCategory.aggregate({
    _sum: { amount: true },
    where: {
      categoryId: category.id,
      transaction: {
        date: {
          gte: category.fund ? undefined : startOfMonth(monthDate),
          lte: endOfMonth(monthDate),
        },
      },
    },
  });
  const totalTransactionAmount = aggregateTransactions._sum.amount ?? 0;

  const balance = (await getTotalBudgetedAmount({ month, category })) + totalTransactionAmount;
  return roundCurrency(balance);
}

export async function calculateCategoryStartingBalance({
  month,
  category,
}: {
  month: string;
  category: Pick<CategoryModel, "id" | "fund">;
}): Promise<number> {
  const monthDate = parse(month, "MM-yyyy", new Date());
  const totalBudgetedAmount = await getTotalBudgetedAmount({ month, category });

  if (!category.fund) {
    return totalBudgetedAmount;
  }

  const aggregateTransactions = await prisma.transactionCategory.aggregate({
    _sum: { amount: true },
    where: {
      categoryId: category.id,
      transaction: {
        // Only include transactions before the start of this budget
        date: { lte: startOfMonth(monthDate) },
      },
    },
  });
  const totalTransactionAmount = aggregateTransactions._sum.amount ?? 0;

  const balance = totalBudgetedAmount + totalTransactionAmount;
  return roundCurrency(balance);
}
