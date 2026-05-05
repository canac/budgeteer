import { createServerFn } from "@tanstack/react-start";
import { differenceInMonths, parseISO, startOfMonth, subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { range } from "~/lib/collections";
import { toISOMonthString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";

export const getBudgetMonths = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const oldestBudget = await prisma.budget.findFirst({
      select: {
        month: true,
      },
      orderBy: { month: "asc" },
    });
    const currentMonth = startOfMonth(new Date());
    const monthSpan = oldestBudget
      ? differenceInMonths(currentMonth, parseISO(oldestBudget.month))
      : 0;
    return range(monthSpan + 1).map((index) => toISOMonthString(subMonths(currentMonth, index)));
  });
