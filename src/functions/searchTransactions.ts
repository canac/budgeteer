import { createServerFn } from "@tanstack/react-start";
import { enum as enumType, number, object, optional, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { TransactionType } from "~/prisma/enums.ts";

const inputSchema = object({
  fromDate: optional(string()),
  toDate: optional(string()),
  categoryId: optional(string()),
  vendor: optional(string()),
  type: optional(enumType(TransactionType)),
  accountId: optional(string()),
  page: number().int().min(1).default(1),
  pageSize: number().int().min(1).max(200),
}).refine((filters) => Object.values(filters).some((filter) => typeof filter === "string"), {
  message: "At least one filter is required",
});

export const searchTransactions = createServerFn()
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(
    async ({ data: { fromDate, toDate, categoryId, vendor, accountId, type, page, pageSize } }) => {
      const where = {
        type: type ?? { not: "BALANCE_ADJUSTMENT" as const },
        ...((!!fromDate || !!toDate) && { date: { gte: fromDate, lte: toDate } }),
        ...(vendor && { vendor: { equals: vendor } }),
        ...(categoryId && { transactionCategories: { some: { categoryId } } }),
        ...(accountId && { externalTransaction: { accountId } }),
      };

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            transactionCategories: {
              include: { category: true },
            },
            transfer: {
              include: {
                sourceCategory: true,
                destinationCategory: true,
              },
            },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.transaction.count({ where }),
      ]);

      return {
        transactions: transactions.map((transaction) => ({
          ...transaction,
          transactionCategories: transaction.transactionCategories.map(({ amount, category }) => ({
            id: category.id,
            amount,
            name: category.name,
          })),
        })),
        total,
      };
    },
  );
