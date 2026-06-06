import { createServerFn } from "@tanstack/react-start";
import { monthString } from "src/lib/zod";
import { literal, object, string, union } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: monthString(),
  categoryId: string(),
  targetId: string(),
  direction: union([literal("before"), literal("after")]),
});

export const reorderCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, categoryId, targetId, direction } }) => {
    const [target, neighbor] = await prisma.category.findMany({
      cursor: { id: targetId },
      where: {
        createdMonth: { lte: month },
        OR: [{ deletedMonth: null }, { deletedMonth: { gt: month } }],
      },
      orderBy: { sortOrder: direction === "before" ? "desc" : "asc" },
      take: 2,
    });
    if (!target) {
      throw new Error("Target category not found");
    }

    const newSortOrder =
      typeof neighbor === "undefined"
        ? target.sortOrder + (direction === "before" ? -1 : 1)
        : (target.sortOrder + neighbor.sortOrder) / 2;
    await prisma.category.update({
      where: { id: categoryId },
      data: { sortOrder: newSortOrder },
    });
  });
