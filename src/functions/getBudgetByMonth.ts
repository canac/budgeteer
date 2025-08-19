import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parse } from "date-fns";
import { prisma } from "~/lib/prisma";
import { object, string } from "zod";

const inputSchema = object({
  month: string(),
});

export const getBudgetByMonth = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { month } }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Error("Invalid month format");
    }
    const budget = await prisma.budget.findFirst({
      where: {
        month,
      },
      include: {
        categories: true,
        budgetFunds: { include: { fund: true } },
      },
    });
    if (!budget) {
      throw new Response("Budget not found");
    }

    const monthDate = parse(month, "MM-yyyy", new Date());
    const historicalTransactions = await prisma.transaction.findMany({
      where: {
        date: { lte: endOfMonth(monthDate) },
      },
    });
    const historicalBudgetFunds = await prisma.budgetFund.findMany({
      where: {
        fundId: { in: budget.budgetFunds.map(({ fundId }) => fundId) },
        budget: { month: { lte: month } },
      },
    });

    return {
      ...budget,
      budgetFunds: budget.budgetFunds.map((budgetFund) => {
        const fundTransactions = historicalTransactions.filter(
          (transaction) => transaction.fundId === budgetFund.fundId,
        );
        const totalBudgetedAmount = historicalBudgetFunds
          .filter(({ fundId }) => fundId === budgetFund.fundId)
          .reduce((sum, { budgetedAmount }) => sum + budgetedAmount, 0);
        const fundBalance = fundTransactions.reduce(
          (sum, transaction) => sum + transaction.amount,
          budgetFund.fund.initialBalance + totalBudgetedAmount,
        );
        return {
          ...budgetFund,
          name: budgetFund.fund.name,
          fundBalance,
        };
      }),
    };
  });
