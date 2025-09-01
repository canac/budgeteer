import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, startOfMonth } from "date-fns";
import { object } from "zod";
import { monthToDate } from "~/lib/monthToDate";
import { prisma } from "~/lib/prisma";
import { month } from "~/lib/zod";

const inputSchema = object({
  month: month(),
});

export const getBudgetTransactions = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { month } }) => {
    const monthDate = monthToDate(month);
    const startDate = startOfMonth(monthDate);
    const endDate = endOfMonth(monthDate);

    const transactions = await prisma.transaction.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: {
        transactionCategories: {
          include: { category: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return transactions.map((transaction) => ({
      ...transaction,
      transactionCategories: transaction.transactionCategories.map(({ category }) => ({
        id: category.id,
        name: category.name,
      })),
    }));
  });
