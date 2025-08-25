import { createServerFn } from "@tanstack/react-start";
import { number, object } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  budgetCategoryId: number(),
  budgetedAmount: number().min(0),
});

export const setCategoryBudgetedAmount = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { budgetCategoryId, budgetedAmount } }) => {
    await prisma.budgetCategory.updateMany({
      where: {
        id: budgetCategoryId,
      },
      data: { budgetedAmount },
    });
  });
