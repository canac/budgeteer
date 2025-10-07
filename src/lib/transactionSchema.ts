import { array, date, number, object, string } from "zod";
import { getFirstMonth } from "~/functions/getFirstMonth";
import { monthToDate } from "./month";

const amountSchema = number()
  .int()
  .refine((value) => value !== 0, { error: "Must not be zero" });

export const transactionSchema = object({
  amount: amountSchema,
  vendor: string().min(1),
  description: string().optional(),
  date: date().refine(
    async (value) => {
      const startDate = await getFirstMonth();
      return !startDate || value >= monthToDate(startDate);
    },
    { error: "Must not be before the first budget" },
  ),
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
