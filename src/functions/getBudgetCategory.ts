import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, startOfMonth } from "date-fns";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateCategoryBalance, calculateCategoryStartingBalance } from "~/lib/calculateBalance";
import { dateToMonth, monthToString } from "~/lib/month";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  month: monthDate(),
  categoryId: string(),
});

export const getBudgetCategory = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, categoryId } }) => {
    const category = await prisma.category.findUniqueOrThrow({
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

    const transactionCategories = await prisma.transactionCategory.findMany({
      where: {
        categoryId,
        transaction: {
          date: { gte: startOfMonth(month), lte: endOfMonth(month) },
        },
      },
      include: {
        transaction: {
          include: { transfer: true },
        },
      },
      orderBy: [{ transaction: { date: "desc" } }, { transaction: { createdAt: "desc" } }],
    });

    return {
      category,
      budgetCategory: category.budgetCategories[0],
      currentBalance: await calculateCategoryBalance({ month, category }),
      startingBalance: await calculateCategoryStartingBalance({ month, category }),
      transactionTotal: transactionCategories.reduce(
        (total, transaction) => total + transaction.amount,
        0,
      ),
      transactions: transactionCategories.map(({ amount, transaction }) => ({
        ...transaction,
        amount,
      })),
      month: dateToMonth(month),
    };
  });
