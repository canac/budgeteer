import { createServerFn } from "@tanstack/react-start";
import { endOfMonth } from "date-fns";
import { object, string } from "zod";
import { activeCategories } from "~/lib/activeCategories";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateBalances } from "~/lib/calculateBalance";
import { toISODateString, toISOMonthString } from "~/lib/iso";
import { leftoversTransferWhere } from "~/lib/leftoversTransferWhere";
import { getPrisma } from "~/lib/prisma";
import { monthDate } from "~/lib/zod";

const inputSchema = object({
  month: monthDate(),
  destinationCategoryId: string(),
});

export const transferLeftovers = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, destinationCategoryId } }) => {
    const prisma = getPrisma();
    const [existing, budget, destination] = await Promise.all([
      prisma.transaction.findFirst({
        where: leftoversTransferWhere(month, { destinationCategoryId }),
        include: { transactionCategories: true },
      }),
      prisma.budget.findUniqueOrThrow({
        where: { month: toISOMonthString(month) },
        include: {
          budgetCategories: {
            where: { category: { accumulating: false } },
            include: { category: true },
          },
        },
      }),
      prisma.category.findUniqueOrThrow({ where: { id: destinationCategoryId } }),
    ]);
    if (!destination.accumulating) {
      throw new Error("Destination must be an accumulating category");
    }
    if (activeCategories([destination], toISOMonthString(month)).length === 0) {
      throw new Error("Destination must exist during the month");
    }

    const leftovers = (await calculateBalances(budget.budgetCategories, month)).filter(
      ({ balance }) => balance !== 0,
    );
    if (leftovers.length === 0) {
      throw new Error("Nothing to transfer");
    }

    const splitAmounts = new Map(
      (existing?.transactionCategories ?? [])
        .filter(({ categoryId }) => categoryId !== destinationCategoryId)
        .map(({ categoryId, amount }) => [categoryId, amount]),
    );
    for (const { categoryId, balance } of leftovers) {
      splitAmounts.set(categoryId, (splitAmounts.get(categoryId) ?? 0) - balance);
    }
    const splits = [...splitAmounts]
      .filter(([, amount]) => amount !== 0)
      .map(([categoryId, amount]) => ({ categoryId, amount }));
    const total = -splits.reduce((sum, { amount }) => sum + amount, 0);
    const transactionCategories =
      total === 0 ? splits : [...splits, { categoryId: destinationCategoryId, amount: total }];

    if (existing) {
      return prisma.transaction.update({
        where: { id: existing.id },
        data: {
          transactionCategories: { deleteMany: {}, create: transactionCategories },
          transfer: { update: { amount: total } },
        },
      });
    }

    return prisma.transaction.create({
      data: {
        type: "TRANSFER",
        amount: 0,
        date: toISODateString(endOfMonth(month)),
        vendor: "Leftovers",
        transactionCategories: { create: transactionCategories },
        transfer: { create: { amount: total, destinationCategoryId } },
      },
    });
  });
