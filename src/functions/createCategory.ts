import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  budgetId: string(),
  name: string().min(1),
  budgetedAmount: number().min(0).default(0),
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .handler(async ({ data: { budgetId, name, budgetedAmount } }) => {
    const category = await prisma.category.create({
      data: {
        name,
      },
    });
    await prisma.budgetCategory.create({
      data: {
        budgetId,
        categoryId: category.id,
        budgetedAmount,
      },
    });
    return category;
  });
