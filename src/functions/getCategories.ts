import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getCategories = createServerFn()
  .middleware([requireAuth])
  .handler(() =>
    prisma.category.findMany({
      where: {
        deletedMonth: null,
      },
      orderBy: { sortOrder: "asc" },
    }),
  );
