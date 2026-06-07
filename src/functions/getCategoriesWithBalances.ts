import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateBalances } from "~/lib/calculateBalance";
import { find } from "~/lib/collections";
import { prisma } from "~/lib/prisma";

export const getCategoriesWithBalances = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const categories = await prisma.category.findMany({
      where: { deletedMonth: null },
      orderBy: { sortOrder: "asc" },
    });

    const balances = await calculateBalances(
      categories.map((category) => ({ categoryId: category.id, category })),
      new Date(),
    );

    return categories.map((category) => ({
      ...category,
      balance: find(balances, "categoryId", category.id)?.balance ?? 0,
    }));
  });
