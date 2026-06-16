import { createServerFn } from "@tanstack/react-start";
import { boolean, number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { monthString } from "~/lib/zod";

const inputSchema = object({
  month: monthString(),
  name: string().min(1),
  budgetedAmount: number().min(0).default(0),
  accumulating: boolean().optional(),
  flexible: boolean().optional(),
});

export const createCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, name, budgetedAmount, accumulating, flexible } }) => {
    const budget = await prisma.budget.findFirstOrThrow({
      where: { month },
    });
    const lastCategory = await prisma.category.findFirst({
      orderBy: { sortOrder: "desc" },
    });
    const category = await prisma.category.create({
      data: {
        name,
        accumulating,
        flexible,
        createdMonth: month,
        sortOrder: (lastCategory?.sortOrder ?? 0) + 1,
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
