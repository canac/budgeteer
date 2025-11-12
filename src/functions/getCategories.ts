import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getCategories = createServerFn()
  .middleware([requireAuth])
  .handler(() => {
    return prisma.category.findMany({
      where: {
        type: { not: "FIXED" },
        deletedMonth: null,
      },
      orderBy: { name: "asc" },
    });
  });
