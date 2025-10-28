import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { prisma } from "~/lib/prisma";
import { transactionSchema } from "~/lib/transactionSchema";
import { validateTransactionDate } from "~/lib/validation";

export const createTransaction = createServerFn({ method: "POST" })
  .inputValidator(transactionSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categories, ...attributes } }) => {
    await validateTransactionDate(attributes.date, pluck(categories, "categoryId"));

    return prisma.transaction.create({
      data: {
        ...attributes,
        transactionCategories: {
          create: categories.map(({ categoryId, amount }) => ({
            categoryId,
            amount,
          })),
        },
      },
    });
  });
