import { createServerFn } from "@tanstack/react-start";
import { object } from "zod";
import { prisma } from "~/lib/prisma";
import { monthString } from "~/lib/zod";

const inputSchema = object({
  month: monthString(),
});

export const cloneBudget = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { month } }) => {
    const existingBudget = await prisma.budget.findFirst({
      where: { month },
      select: { id: true },
    });
    if (existingBudget) {
      throw new Error("Budget already exists");
    }

    const sourceBudget = await prisma.budget.findFirst({
      where: { month: { lt: month } },
      include: {
        budgetCategories: true,
      },
      orderBy: { month: "desc" },
    });

    const newBudget = await prisma.budget.create({
      data: {
        month,
        income: sourceBudget?.income ?? 0,
        budgetCategories: {
          create: sourceBudget?.budgetCategories.map((budgetCategory) => ({
            categoryId: budgetCategory.categoryId,
            budgetedAmount: budgetCategory.budgetedAmount,
          })),
        },
      },
      include: {
        budgetCategories: {
          orderBy: { id: "asc" },
          include: { category: true },
        },
      },
    });
    return newBudget;
  });
