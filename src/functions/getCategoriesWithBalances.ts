import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getCategoriesWithBalances = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const [categories, budgetAggregates, transactionAggregates] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.budgetCategory.groupBy({
        by: ["categoryId"],
        _sum: { budgetedAmount: true },
      }),
      prisma.transactionCategory.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
      }),
    ]);

    const budgetMap = new Map(
      budgetAggregates.flatMap(({ categoryId, _sum: { budgetedAmount } }) =>
        budgetedAmount === null ? [] : [[categoryId, budgetedAmount]],
      ),
    );
    const transactionMap = new Map(
      transactionAggregates.flatMap(({ categoryId, _sum: { amount } }) =>
        amount === null ? [] : [[categoryId, amount]],
      ),
    );

    return categories.map((category) => ({
      ...category,
      balance: (budgetMap.get(category.id) ?? 0) + (transactionMap.get(category.id) ?? 0),
    }));
  });
