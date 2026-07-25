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
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, name, budgetedAmount, accumulating, flexible } }) => {
    const budget = await prisma.budget.findFirstOrThrow({
      where: { month },
    });
    const lastCategory = await prisma.category.findFirst({
      orderBy: { sortOrder: "desc" },
    });
    return prisma.category.create({
      data: {
        name,
        accumulating,
        flexible,
        createdMonth: month,
        sortOrder: (lastCategory?.sortOrder ?? 0) + 1,
        budgetCategories: {
          create: {
            budgetId: budget.id,
            budgetedAmount,
          },
        },
      },
    });
  });
