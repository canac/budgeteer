import { literal, union } from "zod";
import type { Prisma } from "~/prisma/client";
import { pluck } from "~/lib/collections";

export const ruleScopeSchema = union([literal("none"), literal("vendor"), literal("amount")]);

export type RuleScope = "none" | "vendor" | "amount";

export interface RuleSplit {
  categoryId: string;
  amount: number;
}

export interface SaveRuleOptions {
  tx: Prisma.TransactionClient;
  externalTransaction: { vendor: string; amount: number };
  newVendorAlias: string | null;
  scope: RuleScope;
  /** No splits dismisses */
  splits: RuleSplit[];
}

export function assertRuleSplits(splits: RuleSplit[], amount: number) {
  if (splits.length === 0) {
    return;
  }
  if (new Set(pluck(splits, "categoryId")).size !== splits.length) {
    throw new Error("Rule splits must use distinct categories");
  }
  if (splits.some((split) => split.amount === 0 || split.amount * amount < 0)) {
    throw new Error("Rule splits must be non-zero and match the sign of the rule amount");
  }
  if (splits.reduce((sum, split) => sum + split.amount, 0) !== amount) {
    throw new Error("Rule splits must sum to the rule amount");
  }
}

export async function writeAlias(
  tx: Prisma.TransactionClient,
  externalVendor: string,
  vendor: string | null,
): Promise<void> {
  if (vendor && vendor !== externalVendor) {
    await tx.vendorAlias.upsert({
      where: { externalVendor },
      create: { externalVendor, vendor },
      update: { vendor },
    });
  } else {
    await tx.vendorAlias.deleteMany({ where: { externalVendor } });
  }
}

export async function writeVendorRule(
  tx: Prisma.TransactionClient,
  externalVendor: string,
  categoryId: string | null,
): Promise<void> {
  await tx.vendorRule.upsert({
    where: { externalVendor },
    create: { externalVendor, categoryId },
    update: { categoryId },
  });
}

export async function writeAmountRuleSplits(
  tx: Prisma.TransactionClient,
  amountRuleId: string,
  splits: RuleSplit[],
): Promise<void> {
  await tx.amountRuleSplit.deleteMany({ where: { amountRuleId } });
  await tx.amountRuleSplit.createMany({
    data: splits.map(({ categoryId, amount }) => ({ amountRuleId, categoryId, amount })),
  });
}

export async function saveRule({
  tx,
  externalTransaction,
  newVendorAlias,
  scope: requestedScope,
  splits,
}: SaveRuleOptions): Promise<void> {
  // Rules that split transactions into multiple categories must be amount rules
  const scope = requestedScope === "vendor" && splits.length > 1 ? "amount" : requestedScope;
  if (scope === "amount") {
    assertRuleSplits(splits, externalTransaction.amount);
  }

  const externalVendor = externalTransaction.vendor;

  if (newVendorAlias !== null) {
    await writeAlias(tx, externalVendor, newVendorAlias);
  }

  if (scope === "vendor") {
    await writeVendorRule(tx, externalVendor, splits[0]?.categoryId ?? null);
  }

  if (scope === "amount") {
    const amount = externalTransaction.amount;
    const amountRule = await tx.amountRule.upsert({
      where: { externalVendor_amount: { externalVendor, amount } },
      create: { externalVendor, amount },
      // An empty update makes Prisma select-then-insert; the bump keeps ON CONFLICT and its lock
      update: { updatedAt: new Date() },
    });
    await writeAmountRuleSplits(tx, amountRule.id, splits);
  }
}
