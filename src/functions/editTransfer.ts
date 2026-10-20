import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({
  id: string(),
  amount: number().int().positive(),
  description: string().nullish(),
});

export const editTransfer = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id, amount, description } }) => {
    const prisma = getPrisma();
    const { transactionId, sourceCategoryId, destinationCategoryId } =
      await prisma.transfer.findUniqueOrThrow({ where: { id } });
    if (!sourceCategoryId) {
      throw new Error("Leftovers transfers may not be edited");
    }

    return prisma.transfer.update({
      where: { id },
      data: {
        amount,
        transaction: {
          update: {
            description,
            transactionCategories: {
              update: [
                {
                  where: {
                    transactionId_categoryId: { transactionId, categoryId: sourceCategoryId },
                  },
                  data: { amount: -amount },
                },
                {
                  where: {
                    transactionId_categoryId: { transactionId, categoryId: destinationCategoryId },
                  },
                  data: { amount },
                },
              ],
            },
          },
        },
      },
    });
  });
