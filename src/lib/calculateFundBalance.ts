import { endOfMonth, startOfMonth } from "date-fns";
import { prisma } from "~/lib/prisma";
import { roundCurrency } from "~/lib/roundCurrency";
import type { CategoryModel } from "../../generated/prisma/models";
import { monthToString } from "./monthToString";

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
  month: Date;
  category: Pick<CategoryModel, "id" | "fund">;
}): Promise<number> {
  const aggregateTransactions = await prisma.transactionCategory.aggregate({
    _sum: { amount: true },
    where: {
      categoryId: category.id,
      transaction: {
        date: {
          gte: category.fund ? undefined : startOfMonth(month),
          lte: endOfMonth(month),
        },
      },
    },
  });
  const totalTransactionAmount = aggregateTransactions._sum.amount ?? 0;

  const balance =
    (await getTotalBudgetedAmount({ month: monthToString(month), category })) +
    totalTransactionAmount;
  return roundCurrency(balance);
}

export async function calculateCategoryStartingBalance({
  month,
  category,
}: {
  month: Date;
  category: Pick<CategoryModel, "id" | "fund">;
}): Promise<number> {
  const totalBudgetedAmount = await getTotalBudgetedAmount({
    month: monthToString(month),
    category,
  });

  if (!category.fund) {
    return totalBudgetedAmount;
  }

  const aggregateTransactions = await prisma.transactionCategory.aggregate({
    _sum: { amount: true },
    where: {
      categoryId: category.id,
      transaction: {
        // Only include transactions before the start of this budget
        date: { lte: startOfMonth(month) },
      },
    },
  });
  const totalTransactionAmount = aggregateTransactions._sum.amount ?? 0;

  const balance = totalBudgetedAmount + totalTransactionAmount;
  return roundCurrency(balance);
}
