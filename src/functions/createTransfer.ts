import { createServerFn } from "@tanstack/react-start";
import { date, number, object } from "zod";
import { prisma } from "~/lib/prisma";

const transferSchema = object({
  amount: number().int().positive(),
  sourceCategoryId: number(),
  destinationCategoryId: number(),
  date: date(),
});

export const createTransfer = createServerFn({ method: "POST" })
  .validator(transferSchema)
  .handler(async ({ data: { amount, sourceCategoryId, destinationCategoryId, date } }) => {
    const transaction = await prisma.transaction.create({
      data: {
        amount: 0,
        vendor: "Transfer",
        date,
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
      },
    });
    return transaction;
  });
