import { createServerFn } from "@tanstack/react-start";
import { subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getTopCategories = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const transactionCounts = await prisma.transactionCategory.groupBy({
      by: ["categoryId"],
      where: {
        transaction: {
          date: { gte: subMonths(new Date(), 3) },
        },
      },
      _count: {
        categoryId: true,
      },
      orderBy: {
        _count: { categoryId: "desc" },
      },
      take: 3,
    });

    return transactionCounts.map((item) => item.categoryId);
  });
