import { createServerFn } from "@tanstack/react-start";
import { literal, number, object, optional, string, union } from "zod";
import type { Prisma } from "~/prisma/client";
import { requireAuth } from "~/lib/authMiddleware";
import { find, pluck } from "~/lib/collections";
import { getPrisma } from "~/lib/prisma";
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

type View = "unreviewed" | "changed" | "dismissed";

const viewWheres = {
  unreviewed: { reviewed: false, removedAt: null },
  // Removed accepted transactions still appear under "changed"
  changed: { changedAt: { not: null }, transaction: { isNot: null } },
  dismissed: { reviewed: true, transaction: { is: null }, removedAt: null },
} satisfies Record<View, Prisma.ExternalTransactionWhereInput>;

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
    const prisma = getPrisma();
    const accountWhere = accountId ? { accountId } : {};
    const count = (countedView: View) =>
      prisma.externalTransaction.count({ where: { ...viewWheres[countedView], ...accountWhere } });
    const [transactions, unreviewed, changed, dismissed] = await Promise.all([
      prisma.externalTransaction.findMany({
        where: { ...viewWheres[view], ...accountWhere },
        orderBy: [{ date: "desc" }, { id: "asc" }],
        include: {
          account: true,
          transaction: { include: { transactionCategories: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      count("unreviewed"),
      count("changed"),
      count("dismissed"),
    ]);
    const counts = { unreviewed, changed, dismissed };

    const rules = await loadRules(pluck(transactions, "vendor"));
    return {
      transactions: transactions.map((transaction) => {
        const vendorRules = rules.get(transaction.vendor);
        return {
          ...transaction,
          suggestion: vendorRules ? suggestRule(vendorRules, transaction.amount) : null,
        };
      }),
      total: counts[view],
      counts,
    };
  });

export type UnreviewedTransaction = Awaited<
  ReturnType<typeof getUnreviewedTransactions>
>["transactions"][number];
