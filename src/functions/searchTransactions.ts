import { createServerFn } from "@tanstack/react-start";
import { enum as enumType, object, optional, string } from "zod";
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
}).refine((filters) => Object.values(filters).some((filter) => typeof filter === "string"), {
  message: "At least one filter is required",
});

export const searchTransactions = createServerFn()
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { fromDate, toDate, categoryId, vendor, accountId, type } }) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        type: type ?? { not: "BALANCE_ADJUSTMENT" },
        ...((!!fromDate || !!toDate) && { date: { gte: fromDate, lte: toDate } }),
        ...(vendor && { vendor: { equals: vendor } }),
        ...(categoryId && { transactionCategories: { some: { categoryId } } }),
        ...(accountId && { externalTransaction: { accountId } }),
      },
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
    });

    return transactions.map((transaction) => ({
      ...transaction,
      transactionCategories: transaction.transactionCategories.map(({ amount, category }) => ({
        id: category.id,
        amount,
        name: category.name,
      })),
    }));
  });
