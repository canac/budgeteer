import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

export const getCategories = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    getPrisma().category.findMany({
      where: {
        deletedMonth: null,
      },
      orderBy: { sortOrder: "asc" },
    }),
  );
