import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  budgetCategoryId: string(),
  budgetedAmount: number().int().min(0),
});

export const setCategoryBudgetedAmount = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { budgetCategoryId, budgetedAmount } }) => {
    await prisma.budgetCategory.updateMany({
      where: {
        id: budgetCategoryId,
      },
      data: { budgetedAmount },
    });
  });
