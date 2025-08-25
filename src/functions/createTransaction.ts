import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  amount: number(),
  vendor: string().min(1),
  description: string().optional(),
  date: string(), // ISO date string
  categoryId: number(),
});

export const createTransaction = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(
    async ({ data: { amount, vendor, description, date, categoryId } }) => {
      const transaction = await prisma.transaction.create({
        data: {
          amount,
          vendor,
          description,
          date: new Date(date),
          transactionCategories: {
            create: {
              amount,
              categoryId,
            },
          },
        },
      });
      return transaction;
    },
  );
