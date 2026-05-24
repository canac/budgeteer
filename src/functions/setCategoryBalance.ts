import { createServerFn } from "@tanstack/react-start";
import { startOfMonth } from "date-fns";
import { number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateCategoryBalance } from "~/lib/calculateBalance";
import { toISODateString, toISOMonthString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  month: monthDate(),
  targetBalance: number().int(),
});

export const setCategoryBalance = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, month, targetBalance } }) => {
    const monthString = toISOMonthString(month);
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
        OR: [{ deletedMonth: null }, { deletedMonth: { gt: monthString } }],
      },
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const currentBalance = await calculateCategoryBalance({
      month,
      category,
    });
    const adjustmentAmount = targetBalance - currentBalance;
    if (adjustmentAmount === 0) {
      return;
    }

    const adjustmentDate = toISODateString(startOfMonth(month));
    const existingAdjustment = await prisma.transaction.findFirst({
      where: {
        type: "BALANCE_ADJUSTMENT",
        date: adjustmentDate,
        transactionCategories: { some: { categoryId } },
      },
    });

    if (existingAdjustment) {
      const newTotal = existingAdjustment.amount + adjustmentAmount;
      if (newTotal === 0) {
        await prisma.transaction.delete({
          where: { id: existingAdjustment.id },
        });
      } else {
        await prisma.transaction.update({
          where: { id: existingAdjustment.id },
          data: {
            amount: newTotal,
            transactionCategories: {
              updateMany: {
                where: {},
                data: { amount: newTotal },
              },
            },
          },
        });
      }
    } else {
      await prisma.transaction.create({
        data: {
          type: "BALANCE_ADJUSTMENT",
          amount: adjustmentAmount,
          date: adjustmentDate,
          vendor: "Balance Adjustment",
          transactionCategories: {
            create: {
              amount: adjustmentAmount,
              categoryId,
            },
          },
        },
      });
    }
  });
