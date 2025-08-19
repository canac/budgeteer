import { createServerFn } from "@tanstack/react-start";
import { endOfMonth, parse, startOfMonth } from "date-fns";
import { prisma } from "~/lib/prisma";
import { calculateFundBalance } from "~/lib/calculateFundBalance";
import { object, number, string } from "zod";

const inputSchema = object({
  fundId: number(),
  month: string(),
  targetBalance: number(),
});

export const setFundBalance = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { fundId, month, targetBalance } }) => {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
    });
    if (!fund) {
      throw new Error("Fund not found");
    }

    const monthDate = parse(month, "MM-yyyy", new Date());
    const transactions = await prisma.transaction.findMany({
      where: {
        fundId,
        date: { lte: endOfMonth(monthDate) },
      },
    });
    const historicalBudgetFunds = await prisma.budgetFund.findMany({
      where: {
        fundId,
        budget: { month: { lte: month } },
      },
      include: {
        budget: true,
      },
    });

    const currentBalance = calculateFundBalance({
      fund,
      transactions: transactions,
      budgetFunds: historicalBudgetFunds,
    });
    const adjustmentAmount = targetBalance - currentBalance;
    if (Math.abs(adjustmentAmount) < 0.001) {
      return;
    }

    const firstBudgetFund = historicalBudgetFunds.every(
      (budgetFund) => budgetFund.budget.month === month,
    );
    if (firstBudgetFund) {
      // If this is the first budget fund, we can just update the initial balance
      await prisma.fund.update({
        where: { id: fundId },
        data: {
          initialBalance: { increment: adjustmentAmount },
        },
      });
    } else {
      // Otherwise, we need to create a new balance adjustment transaction
      await prisma.transaction.create({
        data: {
          amount: adjustmentAmount,
          date: startOfMonth(monthDate),
          vendor: "Balance Adjustment",
          fundId,
        },
      });
    }
  });
