import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parseISO } from "date-fns";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { toISODateString, toISOMonthString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";
import { validateCategoryDeletion } from "~/lib/validation";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  startMonth: monthDate(),
  endMonth: monthDate(),
  includeTransfers: boolean().default(false),
});

export const getCategoryHistory = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, startMonth, endMonth, includeTransfers } }) => {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw notFound();
    }

    const [transactionCategories, budgetCategories, deletable] = await Promise.all([
      prisma.transactionCategory.findMany({
        where: {
          categoryId,
          transaction: {
            date: {
              gte: toISODateString(startMonth),
              lte: toISODateString(endOfMonth(endMonth)),
            },
            type: {
              in: includeTransfers ? ["TRANSACTION", "TRANSFER"] : ["TRANSACTION"],
            },
          },
        },
        include: {
          transaction: {
            include: { transfer: true },
          },
        },
        orderBy: [{ transaction: { date: "desc" } }, { transaction: { createdAt: "desc" } }],
      }),
      prisma.budgetCategory.findMany({
        where: {
          categoryId,
          budget: {
            month: {
              gte: toISOMonthString(startMonth),
              lte: toISOMonthString(endMonth),
            },
          },
        },
        orderBy: [{ budget: { month: "asc" } }],
        include: {
          budget: true,
        },
      }),
      validateCategoryDeletion(categoryId, toISOMonthString(new Date())),
    ]);
    const startBudgetCategory = budgetCategories[0];
    if (!startBudgetCategory) {
      throw notFound();
    }

    const totalBudgeted = budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.budgetedAmount,
      0,
    );

    const totalSpent = -transactionCategories.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    const monthlyBreakdown = budgetCategories.map(({ budget, budgetedAmount }) => {
      const month = budget.month;
      const monthStart = toISODateString(parseISO(month));
      const monthEnd = toISODateString(endOfMonth(parseISO(month)));
      const spent = -transactionCategories
        .filter(({ transaction }) => transaction.date >= monthStart && transaction.date <= monthEnd)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        month,
        budgeted: budgetedAmount,
        spent,
      };
    });

    return {
      category,
      startMonth: startBudgetCategory.budget.month,
      endMonth: toISOMonthString(endMonth),
      transactions: transactionCategories.map(({ amount, transaction }) => ({
        ...transaction,
        amount,
      })),
      totalBudgeted,
      totalSpent,
      monthlyBreakdown,
      deletable,
    };
  });
