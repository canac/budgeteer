import { createServerFn } from "@tanstack/react-start";
import { number, object } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  id: number(),
});

export const getTransaction = createServerFn()
  .validator(inputSchema)
  .handler(async ({ data: { id } }) => {
    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id },
      include: {
        transactionCategories: {
          include: { category: true },
        },
      },
    });

    return {
      ...transaction,
      transactionCategories: transaction.transactionCategories.map(({ amount, category }) => ({
        id: category.id,
        amount,
        name: category.name,
      })),
    };
  });
