import { createServerFn } from "@tanstack/react-start";
import { differenceInMonths, parse, startOfMonth, subMonths } from "date-fns";
import { prisma } from "~/lib/prisma";

export const getBudgetMonths = createServerFn().handler(async () => {
  const oldestBudget = await prisma.budget.findFirst({
    select: {
      month: true,
    },
    orderBy: { month: "asc" },
  });
  const currentMonth = startOfMonth(new Date());
  const monthSpan = oldestBudget
    ? differenceInMonths(parse(oldestBudget.month, "MM-yyyy", new Date()), currentMonth)
    : 0;
  return Array.from({ length: monthSpan + 1 }, (_, index) => subMonths(currentMonth, index));
});
