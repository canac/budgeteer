import { array, date, number, object, string } from "zod";

const amountSchema = number()
  .int()
  .refine((value) => value !== 0, { message: "Must not be zero" });

export const transactionSchema = object({
  amount: amountSchema,
  vendor: string().min(1),
  description: string().optional(),
  date: date(),
  categories: array(
    object({
      categoryId: string(),
      amount: amountSchema,
    }),
  ).min(1),
}).refine(
  (value) => value.amount === value.categories.reduce((sum, category) => sum + category.amount, 0),
  { error: "Amount must equal the sum of category amounts." },
);
