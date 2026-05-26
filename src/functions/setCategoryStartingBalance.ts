import { createServerFn } from "@tanstack/react-start";
import { subMonths } from "date-fns";
import { number, object, string } from "zod";
import { applyBalanceAdjustment } from "~/lib/applyBalanceAdjustment";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateCategoryBalance } from "~/lib/calculateBalance";
import { toISOMonthString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  month: monthDate(),
  targetBalance: number().int(),
});

export const setCategoryStartingBalance = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, month, targetBalance } }) => {
    const monthString = toISOMonthString(month);
    const category = await prisma.category.findUniqueOrThrow({
      where: {
        id: categoryId,
        type: { not: "NON_ACCUMULATING" },
        OR: [{ deletedMonth: null }, { deletedMonth: { gt: monthString } }],
      },
    });
    const currentBalance = await calculateCategoryBalance({ month: subMonths(month, 1), category });
    await applyBalanceAdjustment({ categoryId, month, amount: targetBalance - currentBalance });
  });
