import { partition } from "@std/collections";
import { endOfMonth, startOfMonth } from "date-fns";
import type { BudgetCategory, Category } from "generated/prisma/client";
import { find, pluck } from "~/lib/collections";
import { monthToString } from "~/lib/month";
import { prisma } from "~/lib/prisma";
import type { CategoryModel } from "../../generated/prisma/models";

type BudgetCategoryWithCategory = Pick<BudgetCategory, "categoryId"> & {
  category: Pick<Category, "fund">;
};

interface BalanceFields {
  spent: number;
  budgeted: number;
  balance: number;
}

export async function calculateBalances<BC extends BudgetCategoryWithCategory>(
  budgetCategories: BC[],
  month: Date,
): Promise<Array<BC & BalanceFields>> {
  const monthString = monthToString(month);
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);

  const [fundCategories, regularCategories] = partition(
    budgetCategories,
    ({ category }) => category.fund,
  );
  const fundCategoryIds = pluck(fundCategories, "categoryId");
  const regularCategoryIds = pluck(regularCategories, "categoryId");

  const [monthlySpent, fundTransactionTotal, regularBudgeted, fundBudgeted] = await Promise.all([
    prisma.transactionCategory.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: pluck(budgetCategories, "categoryId") },
        transaction: {
          date: { gte: startDate, lte: endDate },
        },
      },
      _sum: { amount: true },
    }),
    prisma.transactionCategory.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: fundCategoryIds },
        transaction: {
          date: { lte: endDate },
        },
      },
      _sum: { amount: true },
    }),
    prisma.budgetCategory.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: regularCategoryIds },
        budget: { month: monthString },
      },
      _sum: { budgetedAmount: true },
    }),
    prisma.budgetCategory.groupBy({
      by: ["categoryId"],
      where: {
        categoryId: { in: fundCategoryIds },
        budget: { month: { lte: monthString } },
      },
      _sum: { budgetedAmount: true },
    }),
  ]);

  return budgetCategories.map((budgetCategory) => {
    const { categoryId } = budgetCategory;
    const fund = budgetCategory.category.fund;
    const spent = find(monthlySpent, "categoryId", categoryId)?._sum.amount ?? 0;
    const transactionTotal = fund
      ? (find(fundTransactionTotal, "categoryId", categoryId)?._sum.amount ?? 0)
      : spent;
    const budgeted =
      find(fund ? fundBudgeted : regularBudgeted, "categoryId", categoryId)?._sum.budgetedAmount ??
      0;

    return {
      ...budgetCategory,
      spent,
      budgeted,
      balance: budgeted + transactionTotal,
    } satisfies BC & BalanceFields;
  });
}

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

  return (
    (await getTotalBudgetedAmount({ month: monthToString(month), category })) +
    totalTransactionAmount
  );
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

  return totalBudgetedAmount + totalTransactionAmount;
}
