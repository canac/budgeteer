import { startOfMonth } from "date-fns";
import { toISODateString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";

export async function applyBalanceAdjustment({
  categoryId,
  month,
  amount,
}: {
  categoryId: string;
  month: Date;
  amount: number;
}): Promise<void> {
  if (amount === 0) {
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
    const newTotal = existingAdjustment.amount + amount;
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
        amount,
        date: adjustmentDate,
        vendor: "Balance Adjustment",
        transactionCategories: {
          create: {
            amount,
            categoryId,
          },
        },
      },
    });
  }
}
