import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { isCategoryDeletable } from "~/lib/categoryDeletable";
import { prisma } from "~/lib/prisma";
import { monthString } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  month: monthString(),
});

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, month } }) => {
    if (!(await isCategoryDeletable(categoryId, month))) {
      throw new Error(
        "Cannot delete category: it has transactions in the current or future months",
      );
    }

    await prisma.category.update({
      where: { id: categoryId },
      data: { deletedMonth: month },
    });
    await prisma.budgetCategory.deleteMany({
      where: {
        categoryId,
        budget: {
          month: { gte: month },
        },
      },
    });
  });
