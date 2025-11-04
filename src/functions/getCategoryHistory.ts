import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parseISO } from "date-fns";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { toISODateString } from "~/lib/iso";
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

    const budgetCategories = await prisma.budgetCategory.findMany({
      where: {
        categoryId,
        budget: {
          month: {
            gte: toISODateString(startMonth),
            lte: toISODateString(endMonth),
          },
        },
      },
      orderBy: [{ budget: { month: "asc" } }],
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
      startMonth: budgetCategories[0].budget.month,
      endMonth: toISODateString(endMonth),
      transactions: transactionCategories.map(({ amount, transaction }) => ({
        ...transaction,
        amount,
      })),
      totalBudgeted,
      totalSpent,
      monthlyBreakdown,
    };
  });
