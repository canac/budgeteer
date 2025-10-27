import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { isAfter, isBefore, parseISO, startOfMonth } from "date-fns";
import invariant from "tiny-invariant";
import { object } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateBalances } from "~/lib/calculateBalance";
import { toISOMonthString } from "~/lib/month";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";
import { getFirstMonth } from "./getFirstMonth";

async function getBudget(requestedMonth: Date) {
  const currentMonth = startOfMonth(new Date());
  const currentMonthString = toISOMonthString(currentMonth);
  if (isAfter(requestedMonth, currentMonth)) {
    // A future month was requested, so redirect to the current month
    throw redirect({
      to: "/budget/$month",
      params: { month: currentMonthString },
    });
  }

  const requestedMonthString = toISOMonthString(requestedMonth);
  const actualBudget = await prisma.budget.findFirst({
    where: {
      month: requestedMonthString,
    },
    include: {
      budgetCategories: {
        orderBy: { id: "asc" },
        include: { category: true },
      },
    },
  });
  if (actualBudget) {
    return actualBudget;
  }

  const initialBudgetMonth = await getFirstMonth();
  if (!initialBudgetMonth) {
    // Regardless of the requested month, create the initial budget for the current month and redirect to it
    await prisma.budget.create({
      data: {
        month: currentMonthString,
        income: 0,
      },
    });
    throw redirect({
      to: "/budget/$month",
      params: { month: currentMonthString },
    });
  }

  if (isBefore(requestedMonth, parseISO(initialBudgetMonth))) {
    // A month before the initial budget was requested, so redirect to the initial budget
    throw redirect({
      to: "/budget/$month",
      params: { month: initialBudgetMonth },
    });
  }

  // Clone the first budget before the requested month
  const sourceBudget = await prisma.budget.findFirst({
    where: { month: { lt: requestedMonthString } },
    include: {
      budgetCategories: true,
    },
    orderBy: { month: "desc" },
  });
  invariant(sourceBudget, "No source budget found");
  return prisma.budget.create({
    data: {
      month: requestedMonthString,
      income: sourceBudget.income,
      budgetCategories: {
        create: sourceBudget.budgetCategories.map(({ categoryId, budgetedAmount }) => ({
          categoryId,
          budgetedAmount,
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
}

const inputSchema = object({
  month: monthDate(),
});

export const getBudgetByMonth = createServerFn()
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month } }) => {
    const budget = await getBudget(month);
    const totalBudgetedAmount = budget.budgetCategories.reduce(
      (sum, budgetCategory) => sum + budgetCategory.budgetedAmount,
      0,
    );

    const budgetCategories = await calculateBalances(budget.budgetCategories, month);
    return {
      budget,
      month: toISOMonthString(month),
      totalBudgetedAmount,
      budgetCategories: budgetCategories.map((budgetCategory) => ({
        ...budgetCategory,
        name: budgetCategory.category.name,
      })),
    };
  });
