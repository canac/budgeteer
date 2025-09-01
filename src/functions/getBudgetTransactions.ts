import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parse, startOfMonth } from "date-fns";
import { object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
});

export const getBudgetTransactions = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { month } }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Error("Invalid month format");
    }

    const monthDate = parse(month, "MM-yyyy", new Date());
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
