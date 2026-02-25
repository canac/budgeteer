import { createServerFn } from "@tanstack/react-start";
import { number, object, string, enum as zodEnum } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { monthString } from "~/lib/zod";
import { CategoryType } from "~/prisma/enums";

const inputSchema = object({
  month: monthString(),
  name: string().min(1),
  budgetedAmount: number().min(0).default(0),
  type: zodEnum(Object.values(CategoryType)).optional(),
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, name, budgetedAmount, type } }) => {
    const budget = await prisma.budget.findFirstOrThrow({
      where: { month },
    });
    const category = await prisma.category.create({
      data: {
        name,
        type,
        createdMonth: month,
      },
    });
    await prisma.budgetCategory.create({
      data: {
        budgetId: budget.id,
        categoryId: category.id,
        budgetedAmount,
      },
    });
    return category;
  });
