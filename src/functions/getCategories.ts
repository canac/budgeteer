import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

export const getCategories = createServerFn()
  .middleware([requireAuth])
  .handler(async () => {
    return await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  });
