import { createServerFn } from "@tanstack/react-start";
import { differenceInMonths, parseISO, startOfMonth, subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { toISOMonthString } from "~/lib/month";
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
    return Array.from({ length: monthSpan + 1 }, (_, index) =>
      toISOMonthString(subMonths(currentMonth, index)),
    );
  });
