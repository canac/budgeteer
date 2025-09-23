import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, startOfMonth } from "date-fns";
import { number, object } from "zod";
import {
  calculateCategoryBalance,
  calculateCategoryStartingBalance,
} from "~/lib/calculateFundBalance";
import { monthToString } from "~/lib/monthToString";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  month: monthDate(),
  categoryId: number(),
});

export const getBudgetCategory = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { month, categoryId } }) => {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        budgetCategories: {
          where: {
            budget: { month: monthToString(month) },
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

    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    const transactionCategories = await prisma.transactionCategory.findMany({
      where: {
        categoryId,
        transaction: {
          date: { gte: startDate, lte: endDate },
        },
      },
      include: {
        transaction: {
          include: { transfer: true },
        },
      },
      orderBy: [{ transaction: { date: "desc" } }, { transaction: { createdAt: "desc" } }],
    });

    const currentBalance = await calculateCategoryBalance({ month, category });
    const startingBalance = await calculateCategoryStartingBalance({ month, category });

    const transactionTotal = transactionCategories.reduce(
      (total, transaction) => total + transaction.amount,
      0,
    );

    const budgetCategory = category.budgetCategories[0];

    return {
      category,
      budgetCategory,
      currentBalance: currentBalance,
      startingBalance: startingBalance,
      transactionTotal: transactionTotal,
      transactions: transactionCategories.map(({ amount, transaction }) => ({
        ...transaction,
        amount,
      })),
      month,
    };
  });
