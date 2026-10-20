import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({
  budgetCategoryId: string(),
  budgetedAmount: number().int().min(0),
});

export const setCategoryBudgetedAmount = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { budgetCategoryId, budgetedAmount } }) => {
    await getPrisma().budgetCategory.update({
      where: {
        id: budgetCategoryId,
      },
      data: { budgetedAmount },
    });
  });
