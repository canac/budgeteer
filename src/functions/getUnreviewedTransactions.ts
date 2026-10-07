import { createServerFn } from "@tanstack/react-start";
import { literal, number, object, optional, string, union } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { find, pluck } from "~/lib/collections";
import { prisma } from "~/lib/prisma";
import { loadRules, type RuleOutcome, type VendorRules } from "~/lib/ruleLookup";

interface Suggestion {
  vendorAlias: string | null;
  /** null suggests only the alias */
  outcome: RuleOutcome | null;
  amountRule: boolean;
}

export function suggestRule(
  { vendorAlias, vendorRule, amountRules }: VendorRules,
  amount: number,
): Suggestion | null {
  const amountRule = find(amountRules, "amount", amount);
  if (amountRule) {
    return { vendorAlias, outcome: amountRule.outcome, amountRule: true };
  }

  if (vendorRule) {
    return {
      vendorAlias,
      outcome:
        vendorRule.type === "categorize"
          ? {
              type: "categorize",
              splits: vendorRule.splits.map(({ category }) => ({ category, amount })),
            }
          : vendorRule,
      amountRule: false,
    };
  }

  return vendorAlias ? { vendorAlias, outcome: null, amountRule: false } : null;
}

const inputSchema = object({
  page: number().int().min(1).default(1),
  pageSize: number().int().min(1).max(200),
  view: union([literal("unreviewed"), literal("changed"), literal("dismissed")]).default(
    "unreviewed",
  ),
  accountId: optional(string()),
});

export const getUnreviewedTransactions = createServerFn()
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { page, pageSize, view, accountId } }) => {
    const viewWhere =
      view === "dismissed"
        ? { reviewed: true, transaction: { is: null }, removedAt: null }
        : view === "changed"
          ? // Removed accepted transactions still appear under "changed"
            { changedAt: { not: null }, transaction: { isNot: null } }
          : { reviewed: false, removedAt: null };
    const where = { ...viewWhere, ...(accountId && { accountId }) };
    const [transactions, total] = await Promise.all([
      prisma.externalTransaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "asc" }],
        include: {
          account: true,
          transaction: { include: { transactionCategories: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.externalTransaction.count({ where }),
    ]);

    const rules = await loadRules(pluck(transactions, "vendor"));
    return {
      transactions: transactions.map((transaction) => {
        const vendorRules = rules.get(transaction.vendor);
        return {
          ...transaction,
          suggestion: vendorRules ? suggestRule(vendorRules, transaction.amount) : null,
        };
      }),
      total,
    };
  });

export type UnreviewedTransaction = Awaited<
  ReturnType<typeof getUnreviewedTransactions>
>["transactions"][number];
