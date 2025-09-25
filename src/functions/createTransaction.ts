import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";
import { transactionSchema } from "~/lib/transactionSchema";

export const createTransaction = createServerFn({ method: "POST" })
  .inputValidator(transactionSchema)
  .handler(({ data: { categories, ...attributes } }) => {
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
