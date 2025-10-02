import { createServerFn } from "@tanstack/react-start";
import { differenceInMonths, parse, startOfMonth, subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { dateToMonth } from "~/lib/month";
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
      ? differenceInMonths(currentMonth, parse(oldestBudget.month, "MM-yyyy", new Date()))
      : 0;
    return Array.from({ length: monthSpan + 1 }, (_, index) =>
      dateToMonth(subMonths(currentMonth, index)),
    );
  });
