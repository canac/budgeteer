import { createServerFn } from "@tanstack/react-start";
import { boolean, number, object } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  page: number().int().min(1).default(1),
  pageSize: number().int().min(1).max(200),
  rejected: boolean().default(false),
});

export const getUnreviewedTransactions = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { page, pageSize, rejected } }) => {
    const where = rejected ? { reviewed: true, transaction: { is: null } } : { reviewed: false };
    const [transactions, total] = await Promise.all([
      prisma.tellerTransaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { id: "asc" }],
        include: { account: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tellerTransaction.count({ where }),
    ]);

    const rules = await prisma.categorizationRule.findMany({
      where: { tellerVendor: { in: pluck(transactions, "vendor") } },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
    const ruleByVendor = new Map(rules.map((rule) => [rule.tellerVendor, rule]));

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
