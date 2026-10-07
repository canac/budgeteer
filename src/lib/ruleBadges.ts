import type { RuleOutcome } from "~/lib/ruleLookup";
import { formatSignedCurrency } from "~/lib/formatters";

export type BadgeOutcome = RuleOutcome<{
  category: { name: string };
  /** No amount means the category takes the transaction's whole amount */
  amount?: number;
}> | null;

export function ruleBadgeLabels(outcome: BadgeOutcome): string[] {
  if (!outcome) {
    return [];
  }

  if (outcome.type === "dismiss") {
    return ["Dismiss"];
  }

  return outcome.splits.map(({ category, amount }) =>
    outcome.splits.length === 1 || amount === undefined
      ? category.name
      : `${category.name} ${formatSignedCurrency(amount)}`,
  );
}
