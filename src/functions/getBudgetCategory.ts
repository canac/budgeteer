import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, startOfMonth } from "date-fns";
import { number, object } from "zod";
import {
  calculateCategoryBalance,
  calculateCategoryStartingBalance,
} from "~/lib/calculateFundBalance";
import { monthToDate } from "~/lib/monthToDate";
import { prisma } from "~/lib/prisma";
import { roundCurrency } from "~/lib/roundCurrency";
import { month } from "~/lib/zod";

const inputSchema = object({
  month: month(),
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

    const monthDate = monthToDate(month);
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
      currentBalance: roundCurrency(currentBalance),
      startingBalance: roundCurrency(startingBalance),
      transactionTotal: roundCurrency(transactionTotal),
      transactions: transactionCategories.map((transaction) => ({
        id: transaction.transaction.id,
        amount: transaction.amount,
        date: transaction.transaction.date,
        vendor: transaction.transaction.vendor,
        description: transaction.transaction.description,
      })),
      month,
    };
  });
