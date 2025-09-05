import { mapNotNullish } from "@std/collections";
import { createServerFn } from "@tanstack/react-start";
import { number } from "zod";
import { prisma } from "~/lib/prisma";
import { transactionSchema } from "~/lib/transactionSchema";

const inputSchema = transactionSchema.extend({
  id: number(),
});

export const editTransaction = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { id, categories, ...attributes } }) => {
    const existingCategories = await prisma.transactionCategory.findMany({
      where: { transactionId: id },
    });
    const existingCategoryIds = new Set(existingCategories.map(({ categoryId }) => categoryId));
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
