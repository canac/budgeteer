import { memoize } from "@std/cache";
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

export const getFirstMonth = createServerFn()
  .middleware([requireAuth])
  .handler(
    memoize(async () => {
      const oldestBudget = await getPrisma().budget.findFirst({
        select: {
          month: true,
        },
        orderBy: { month: "asc" },
      });
      return oldestBudget?.month ?? null;
    }),
  );
