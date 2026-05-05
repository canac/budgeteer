import { mapNotNullish } from "@std/collections";
import { createServerFn } from "@tanstack/react-start";
import { string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { pluck } from "~/lib/collections";
import { prisma } from "~/lib/prisma";
import { transactionSchema } from "~/lib/transactionSchema";
import { ensureValid, validateTransactionDate } from "~/lib/validation";

const inputSchema = transactionSchema.extend({
  id: string(),
});

export const editTransaction = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { id, categories, ...attributes } }) => {
    ensureValid(await validateTransactionDate(attributes.date, pluck(categories, "categoryId")));

    const existing = await prisma.transaction.findUniqueOrThrow({
      where: { id },
      include: { transactionCategories: true },
    });

    if (
      existing.tellerId &&
      (existing.date !== attributes.date || existing.amount !== attributes.amount)
    ) {
      throw new Error("The date and amount of imported transactions are immutable");
    }

    const existingCategories = existing.transactionCategories;
    const existingCategoryIds = new Set(pluck(existingCategories, "categoryId"));
    const newCategories = new Map(categories.map((category) => [category.categoryId, category]));

    return prisma.transaction.update({
      where: { id },
      data: {
        ...attributes,
        transactionCategories: {
          create: mapNotNullish(categories, ({ categoryId, amount }) =>
            existingCategoryIds.has(categoryId) ? null : { categoryId, amount },
          ),
          update: mapNotNullish(existingCategories, (category) => {
            const newCategory = newCategories.get(category.categoryId);
            return (
              newCategory && {
                where: { id: category.id },
                data: { amount: newCategory.amount },
              }
            );
          }),
          delete: mapNotNullish(existingCategories, (category) =>
            !newCategories.has(category.categoryId) ? { id: category.id } : null,
          ),
        },
      },
    });
  });
