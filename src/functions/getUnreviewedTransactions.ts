import { createServerFn } from "@tanstack/react-start";
import { literal, number, object, union } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  page: number().int().min(1).default(1),
  pageSize: number().int().min(1).max(200),
  view: union([literal("unreviewed"), literal("changed"), literal("rejected")]).default(
    "unreviewed",
  ),
});

export const getUnreviewedTransactions = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { page, pageSize, view } }) => {
    const where =
      view === "rejected"
        ? { reviewed: true, transaction: { is: null } }
        : view === "changed"
          ? { changedAt: { not: null }, transaction: { isNot: null } }
          : { reviewed: false };
    const [transactions, total] = await Promise.all([
      prisma.externalTransaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "asc" }],
        include: { account: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.externalTransaction.count({ where }),
    ]);

    const rules = await prisma.categorizationRule.findMany({
      where: { externalVendor: { in: pluck(transactions, "vendor") } },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
    const ruleByVendor = new Map(rules.map((rule) => [rule.externalVendor, rule]));

    return {
      transactions: transactions.map((transaction) => ({
        ...transaction,
        rule: ruleByVendor.get(transaction.vendor) ?? null,
      })),
      total,
    };
  });

export type UnreviewedTransaction = Awaited<
  ReturnType<typeof getUnreviewedTransactions>
>["transactions"][number];
