import { createServerFn } from "@tanstack/react-start";
import { subMonths } from "date-fns";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { toISODateString } from "~/lib/iso";
import { prisma } from "~/lib/prisma";

export const getTopCategories = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const transactionCounts = await prisma.transactionCategory.groupBy({
      by: ["categoryId"],
      where: {
        transaction: {
          date: { gte: toISODateString(subMonths(new Date(), 3)) },
          type: { not: "BALANCE_ADJUSTMENT" },
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

    return pluck(transactionCounts, "categoryId");
  });
