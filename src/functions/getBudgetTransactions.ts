import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, startOfMonth } from "date-fns";
import { object } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  month: monthDate(),
});

export const getBudgetTransactions = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month } }) => {
    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        transactionCategories: {
          include: { category: true },
        },
        transfer: {
          include: {
            sourceCategory: true,
            destinationCategory: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return transactions.map((transaction) => ({
      ...transaction,
      transactionCategories: transaction.transactionCategories.map(({ amount, category }) => ({
        id: category.id,
        amount,
        name: category.name,
      })),
    }));
  });
