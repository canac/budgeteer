import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  vendor: string(),
});

const SUGGESTION_COUNT = 3;

export interface CategorySuggestion {
  categoryId: string;
  name: string;
  date: string;
}

export const getVendorCategorySuggestions = createServerFn()
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { vendor } }): Promise<CategorySuggestion[]> => {
    const history = await prisma.transactionCategory.findMany({
      where: {
        transaction: { vendor, type: "TRANSACTION" },
      },
      select: {
        categoryId: true,
        category: { select: { name: true } },
        transaction: { select: { date: true } },
      },
      orderBy: [
        { transaction: { date: "desc" } },
        { transaction: { createdAt: "desc" } },
        { category: { name: "asc" } },
      ],
    });

    const suggestions = new Map<string, CategorySuggestion>();
    for (const entry of history) {
      if (suggestions.size === SUGGESTION_COUNT) {
        break;
      }
      if (!suggestions.has(entry.categoryId)) {
        suggestions.set(entry.categoryId, {
          categoryId: entry.categoryId,
          name: entry.category.name,
          date: entry.transaction.date,
        });
      }
    }

    return [...suggestions.values()];
  });
