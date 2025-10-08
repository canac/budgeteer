import { createServerFn } from "@tanstack/react-start";
import { CategoryType } from "generated/prisma/enums";
import { number, object, string, enum as zodEnum } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  budgetId: string(),
  name: string().min(1),
  budgetedAmount: number().min(0).default(0),
  type: zodEnum(Object.values(CategoryType)).optional(),
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { budgetId, name, budgetedAmount, type } }) => {
    const category = await prisma.category.create({
      data: {
        name,
        type,
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
