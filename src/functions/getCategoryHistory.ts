import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eachMonthOfInterval } from "date-fns";
import { boolean, date, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { monthToString } from "~/lib/month";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  categoryId: string(),
  startDate: date(),
  endDate: date(),
  includeTransfers: boolean().default(false),
});

export const getCategoryHistory = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, startDate, endDate, includeTransfers } }) => {
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
          date: { gte: startDate, lte: endDate },
          ...(includeTransfers ? {} : { transfer: null }),
        },
      },
      include: {
        transaction: {
          include: { transfer: true },
        },
      },
      orderBy: [{ transaction: { date: "desc" } }, { transaction: { createdAt: "desc" } }],
    });

    const budgetMonths = eachMonthOfInterval({ start: startDate, end: endDate }).map((date) =>
      monthToString(date),
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

    return {
      category,
      transactions: transactionCategories.map(({ amount, transaction }) => ({
        ...transaction,
        amount,
      })),
      totalBudgeted,
      totalSpent,
    };
  });
