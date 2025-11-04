import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eachMonthOfInterval, endOfMonth, parseISO } from "date-fns";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { toISODateString, toISOMonthString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";
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
      where: {
        id: categoryId,
        type: { not: "FIXED" },
      },
    });
    if (!category) {
      throw notFound();
    }

    const transactionCategories = await prisma.transactionCategory.findMany({
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
    });

    const budgetMonths = eachMonthOfInterval({ start: startMonth, end: endMonth }).map((date) =>
      toISOMonthString(date),
    );
    const budgetCategories = await prisma.budgetCategory.findMany({
      where: {
        categoryId,
        budget: {
          month: { in: budgetMonths },
        },
      },
      include: {
        budget: true,
      },
    });

    const totalBudgeted = budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.budgetedAmount,
      0,
    );

    const totalSpent = -transactionCategories.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    const monthlyBreakdown = budgetCategories.map((budgetCategory) => {
      const month = budgetCategory.budget.month;
      const monthStart = toISODateString(parseISO(month));
      const monthEnd = toISODateString(endOfMonth(parseISO(month)));
      const spent = -transactionCategories
        .filter(({ transaction }) => transaction.date >= monthStart && transaction.date <= monthEnd)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        month,
        budgeted: budgetCategory.budgetedAmount,
        spent,
      };
    });

    return {
      category,
      transactions: transactionCategories.map(({ amount, transaction }) => ({
        ...transaction,
        amount,
      })),
      totalBudgeted,
      totalSpent,
      monthlyBreakdown,
    };
  });
