import { createServerFn } from "@tanstack/react-start";
import { startOfMonth } from "date-fns";
import { number, object, string } from "zod";
import { calculateCategoryBalance } from "~/lib/calculateFundBalance";
import { prisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  month: monthDate(),
  targetBalance: number().int(),
});

export const setCategoryBalance = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
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
    if (adjustmentAmount === 0) {
      return;
    }

    // Create a new balance adjustment transaction
    await prisma.transaction.create({
      data: {
        amount: adjustmentAmount,
        date: startOfMonth(month),
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
