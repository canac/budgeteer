import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { calculateCurrentCategoryBalance } from "~/lib/calculateFundBalance";
import { prisma } from "~/lib/prisma";

export const getCategoriesWithBalances = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return Promise.all(
      categories.map(async (category) => ({
        ...category,
        balance: await calculateCurrentCategoryBalance(category.id),
      })),
    );
  });
