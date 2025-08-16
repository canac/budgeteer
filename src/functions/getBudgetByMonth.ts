import { createServerFn } from "@tanstack/react-start";
import { endOfMonth } from "date-fns";
import { prisma } from "~/lib/prisma";

export const getBudgetByMonth = createServerFn()
  .validator((data: string) => data)
  .handler(async ({ data: month }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Response("Invalid month format", { status: 400 });
    }
    const budget = await prisma.budget.findFirst({
      where: {
        month,
      },
      include: {
        categories: true,
        budgetFunds: { include: { fund: true, transactions: true } },
      },
    });
    if (!budget) {
      throw new Response("Budget not found", { status: 404 });
    }

    const allTransactions = await prisma.transaction.findMany({
      where: {
        date: { lte: endOfMonth(month) },
      },
      include: { budgetFund: true },
    });

    return {
      ...budget,
      budgetFunds: budget.budgetFunds.map((budgetFund) => {
        const fundTransactions = allTransactions.filter(
          (transaction) => transaction.budgetFund?.fundId === budgetFund.fundId,
        );
        const fundBalance = fundTransactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          budgetFund.fund.initialBalance,
        );
        return {
          ...budgetFund,
          name: budgetFund.fund.name,
          fundBalance,
        };
      }),
    };
  });
