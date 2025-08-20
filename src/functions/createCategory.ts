import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";
import { object, string, number } from "zod";

const inputSchema = object({
  budgetId: number(),
  name: string().min(1),
  amount: number().min(0).default(0),
});

export const createCategory = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { budgetId, name, amount } }) => {
    const category = await prisma.category.create({
      data: {
        name,
        amount,
        budgetId,
      },
    });
    return category;
  });
