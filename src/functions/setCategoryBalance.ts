import { createServerFn } from "@tanstack/react-start";
import { startOfMonth } from "date-fns";
import { number, object, string } from "zod";
import { calculateCategoryBalance } from "~/lib/calculateFundBalance";
import { monthToDate } from "~/lib/monthToDate";
import { prisma } from "~/lib/prisma";
import { roundCurrency } from "~/lib/roundCurrency";

const inputSchema = object({
  categoryId: number(),
  month: string(),
  targetBalance: number(),
});

export const setCategoryBalance = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { categoryId, month, targetBalance } }) => {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error("Category not found");
    }

    const currentBalance = await calculateCategoryBalance({
      month,
      category,
    });
    const adjustmentAmount = targetBalance - currentBalance;
    if (roundCurrency(adjustmentAmount) === 0) {
      return;
    }

    // Create a new balance adjustment transaction
    await prisma.transaction.create({
      data: {
        amount: adjustmentAmount,
        date: startOfMonth(monthToDate(month)),
        vendor: "Balance Adjustment",
        transactionCategories: {
          create: {
            amount: adjustmentAmount,
            categoryId,
          },
        },
      },
    });
  });
