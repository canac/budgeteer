import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  id: string(),
});

export const getTransaction = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
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
