import { array, coerce, number, object, string } from "zod";

export const transactionSchema = object({
  amount: number(),
  vendor: string().min(1),
  description: string().optional(),
  date: coerce.date(),
  categories: array(
    object({
      categoryId: number(),
      amount: number(),
    }),
  ).min(1),
}).refine(
  (value) => value.amount === value.categories.reduce((sum, category) => sum + category.amount, 0),
  { error: "Amount must equal the sum of category amounts." },
);
