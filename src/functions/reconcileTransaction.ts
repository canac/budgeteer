import { createServerFn } from "@tanstack/react-start";
import { array, number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  id: string(),
  categories: array(
    object({
      categoryId: string(),
      amount: number().int(),
    }),
  )
    .min(1)
    .optional(),
});

export const reconcileTransaction = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id, categories } }) => {
    const externalTransaction = await prisma.externalTransaction.findUniqueOrThrow({
      where: { id },
      include: { transaction: { include: { transactionCategories: true } } },
    });

    const { transaction, changedAt, amount, date } = externalTransaction;
    if (!changedAt || !transaction) {
      throw new Error("Only transactions changed at the bank can be reconciled");
    }

    const newCategories =
      categories ??
      (transaction.transactionCategories.length === 1
        ? [{ categoryId: transaction.transactionCategories[0]!.categoryId, amount }]
        : null);
    if (!newCategories) {
      throw new Error("Split transactions must be reconciled with explicit category amounts");
    }

    const total = newCategories.reduce((sum, category) => sum + category.amount, 0);
    if (total !== amount) {
      throw new Error("Category amounts must sum to transaction amount");
    }

    return prisma.$transaction(async (tx) => {
      await tx.transactionCategory.deleteMany({
        where: { transactionId: transaction.id },
      });
      const updated = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          amount,
          date,
          transactionCategories: { create: newCategories },
        },
      });
      await tx.externalTransaction.update({
        where: { id },
        data: { changedAt: null },
      });
      return updated;
    });
  });
