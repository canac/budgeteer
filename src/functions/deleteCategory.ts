import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { ensureValid, validateCategoryDeletion } from "~/lib/validation";
import { monthString } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  month: monthString(),
});

export const deleteCategory = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, month } }) => {
    ensureValid(await validateCategoryDeletion(categoryId, month));

    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id: categoryId },
        data: { deletedMonth: month },
      });
      await tx.budgetCategory.deleteMany({
        where: {
          categoryId,
          budget: {
            month: { gte: month },
          },
        },
      });
    });
  });
