import type {
  FundModel,
  TransactionModel,
  BudgetFundModel,
} from "../../generated/prisma/models";

export function calculateFundBalance({
  fund,
  transactions,
  budgetFunds,
}: {
  fund: Pick<FundModel, "initialBalance">;
  transactions: Array<Pick<TransactionModel, "amount">>;
  budgetFunds: Array<Pick<BudgetFundModel, "budgetedAmount">>;
}): number {
  const totalTransactionAmount = transactions.reduce(
    (total, transaction) => total + transaction.amount,
    0,
  );

  const totalBudgetedAmount = budgetFunds.reduce(
    (total, budgetFund) => total + budgetFund.budgetedAmount,
    0,
  );

  return fund.initialBalance + totalBudgetedAmount + totalTransactionAmount;
}
