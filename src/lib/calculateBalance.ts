import { partition } from "@std/collections";
import { endOfMonth, startOfMonth } from "date-fns";
import type { BudgetCategory, Category, CategoryType } from "generated/prisma/client";
import { find, pluck } from "~/lib/collections";
import { toISOMonthString } from "~/lib/month";
import { prisma } from "~/lib/prisma";

function isFund(categoryType: CategoryType): boolean {
  return categoryType === "SAVINGS" || categoryType === "ACCUMULATING";
}

type BudgetCategoryWithCategory = Pick<BudgetCategory, "categoryId"> & {
  category: Pick<Category, "type">;
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
  const monthString = toISOMonthString(month);
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);

  const [fundCategories, regularCategories] = partition(budgetCategories, ({ category }) =>
    isFund(category.type),
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
    const isCategoryFund = isFund(budgetCategory.category.type);
    const spent = find(monthlySpent, "categoryId", categoryId)?._sum.amount ?? 0;
    const transactionTotal = isCategoryFund
      ? (find(fundTransactionTotal, "categoryId", categoryId)?._sum.amount ?? 0)
      : spent;
    const budgeted =
      find(isCategoryFund ? fundBudgeted : regularBudgeted, "categoryId", categoryId)?._sum
        .budgetedAmount ?? 0;

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
  category: Pick<Category, "id" | "type">;
}): Promise<number> {
  const aggregateBudgetCategories = await prisma.budgetCategory.aggregate({
    _sum: { budgetedAmount: true },
    where: {
      categoryId: category.id,
      budget: { month: isFund(category.type) ? { lte: month } : month },
    },
  });
  return aggregateBudgetCategories._sum.budgetedAmount ?? 0;
}

export async function calculateCategoryBalance({
  month,
  category,
}: {
  month: Date;
  category: Pick<Category, "id" | "type">;
}): Promise<number> {
  const aggregateTransactions = await prisma.transactionCategory.aggregate({
    _sum: { amount: true },
    where: {
      categoryId: category.id,
      transaction: {
        date: {
          gte: isFund(category.type) ? undefined : startOfMonth(month),
          lte: endOfMonth(month),
        },
      },
    },
  });
  const totalTransactionAmount = aggregateTransactions._sum.amount ?? 0;

  return (
    (await getTotalBudgetedAmount({ month: toISOMonthString(month), category })) +
    totalTransactionAmount
  );
}

export async function calculateCategoryStartingBalance({
  month,
  category,
}: {
  month: Date;
  category: Pick<Category, "id" | "type">;
}): Promise<number> {
  const totalBudgetedAmount = await getTotalBudgetedAmount({
    month: toISOMonthString(month),
    category,
  });

  if (!isFund(category.type)) {
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
