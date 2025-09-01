import { createServerFn } from "@tanstack/react-start";
import { array, number, object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  amount: number().min(0),
  vendor: string().min(1),
  description: string().optional(),
  date: string(), // ISO date string
  categories: array(
    object({
      categoryId: number(),
      amount: number().min(0),
    }),
  ).min(1),
}).refine(
  (value) => value.amount === value.categories.reduce((sum, category) => sum + category.amount, 0),
  { error: "Amount must equal the sum of category amounts." },
);

export const createTransaction = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { amount, vendor, description, date, categories } }) => {
    const transaction = await prisma.transaction.create({
      data: {
        amount,
        vendor,
        description,
        date: new Date(date),
        transactionCategories: {
          create: categories.map(({ categoryId, amount }) => ({
            categoryId,
            amount,
          })),
        },
      },
    });
    return transaction;
  });
