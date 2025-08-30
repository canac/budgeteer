import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parse, startOfMonth } from "date-fns";
import { number, object, string } from "zod";
import { calculateCategoryBalance } from "~/lib/calculateFundBalance";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
  categoryId: number(),
});

export const getCategoryDetails = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { month, categoryId } }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Error("Invalid month format");
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        budgetCategories: {
          where: {
            budget: { month },
          },
          include: {
            budget: true,
          },
        },
      },
    });
    if (!category) {
      throw new Response("Category not found", { status: 404 });
    }

    const monthDate = parse(month, "MM-yyyy", new Date());
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    const transactionCategories = await prisma.transactionCategory.findMany({
      where: {
        categoryId,
        transaction: {
          date: { gte: startDate, lte: endDate },
        },
      },
      include: { transaction: true },
      orderBy: { transaction: { date: "desc" } },
    });

    // Calculate current balance
    const currentBalance = await calculateCategoryBalance({
      month,
      category,
    });

    // Calculate starting balance (beginning of month)
    const previousMonthTransactions =
      await prisma.transactionCategory.aggregate({
        _sum: { amount: true },
        where: {
          categoryId: category.id,
          transaction: {
            date: {
              gte: category.fund ? undefined : undefined,
              lt: startDate,
            },
          },
        },
      });

    const previousMonthBudgetCategories = await prisma.budgetCategory.aggregate(
      {
        _sum: { budgetedAmount: true },
        where: {
          categoryId: category.id,
          budget: {
            month: category.fund ? { lt: month } : { lt: month },
          },
        },
      },
    );

    const startingBalance =
      (previousMonthBudgetCategories._sum.budgetedAmount ?? 0) +
      (previousMonthTransactions._sum.amount ?? 0);

    const monthlySpending = await prisma.transactionCategory.aggregate({
      _sum: { amount: true },
      where: {
        categoryId,
        transaction: {
          date: {
            gte: category.fund ? undefined : startDate,
            lte: endDate,
          },
        },
      },
    });
    const amountSpentThisMonth = Math.abs(monthlySpending._sum.amount ?? 0);

    const budgetCategory = category.budgetCategories[0];

    return {
      category,
      budgetCategory,
      currentBalance: Math.round(currentBalance * 100) / 100,
      startingBalance: Math.round(startingBalance * 100) / 100,
      amountSpentThisMonth: Math.round(amountSpentThisMonth * 100) / 100,
      transactions: transactionCategories.map((transaction) => ({
        id: transaction.id,
        amount: transaction.amount,
        date: transaction.transaction.date,
        vendor: transaction.transaction.vendor,
        description: transaction.transaction.description,
      })),
      month,
    };
  });
