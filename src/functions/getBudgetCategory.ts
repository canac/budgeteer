import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parse, startOfMonth } from "date-fns";
import { number, object, string } from "zod";
import {
  calculateCategoryBalance,
  calculateCategoryStartingBalance,
} from "~/lib/calculateFundBalance";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
  categoryId: number(),
});

export const getBudgetCategory = createServerFn()
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
      currentBalance: Math.round(currentBalance * 100) / 100,
      startingBalance: Math.round(startingBalance * 100) / 100,
      transactionTotal: Math.round(transactionTotal * 100) / 100,
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
