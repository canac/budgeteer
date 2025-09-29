import { createServerFn } from "@tanstack/react-start";
import { date, number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const transferSchema = object({
  amount: number().int().positive(),
  date: date(),
  sourceCategoryId: string(),
  destinationCategoryId: string(),
});

export const createTransfer = createServerFn({ method: "POST" })
  .inputValidator(transferSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { amount, date, sourceCategoryId, destinationCategoryId } }) => {
    const transaction = await prisma.transaction.create({
      data: {
        amount: 0,
        date,
        vendor: "Transfer",
        transactionCategories: {
          create: [
            {
              categoryId: sourceCategoryId,
              amount: -amount,
            },
            {
              categoryId: destinationCategoryId,
              amount: amount,
            },
          ],
        },
        transfer: {
          create: {
            amount,
            sourceCategoryId,
            destinationCategoryId,
          },
        },
      },
    });
    return transaction;
  });
