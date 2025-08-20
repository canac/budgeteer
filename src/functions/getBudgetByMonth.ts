import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parse } from "date-fns";
import { prisma } from "~/lib/prisma";
import { calculateFundBalance } from "~/lib/calculateFundBalance";
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
        categories: { orderBy: { id: "asc" } },
        budgetFunds: { orderBy: { id: "asc" }, include: { fund: true } },
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

    const totalCategoryAmount = budget.categories.reduce(
      (sum, category) => sum + category.amount,
      0,
    );
    const totalBudgetFundAmount = budget.budgetFunds.reduce(
      (sum, budgetFund) => sum + budgetFund.budgetedAmount,
      0,
    );

    return {
      ...budget,
      totalBudgetedAmount: totalCategoryAmount + totalBudgetFundAmount,
      budgetFunds: budget.budgetFunds.map((budgetFund) => {
        const fundTransactions = historicalTransactions.filter(
          (transaction) => transaction.fundId === budgetFund.fundId,
        );
        const fundBudgetFunds = historicalBudgetFunds.filter(
          ({ fundId }) => fundId === budgetFund.fundId,
        );
        return {
          ...budgetFund,
          name: budgetFund.fund.name,
          fundBalance: calculateFundBalance({
            fund: budgetFund.fund,
            transactions: fundTransactions,
            budgetFunds: fundBudgetFunds,
          }),
        };
      }),
    };
  });
