import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";
import { categoryType } from "~/lib/zod";

const inputSchema = object({
  categoryId: string(),
  name: string().min(1).optional(),
  type: categoryType().optional(),
});

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, ...fields } }) => {
    await prisma.category.update({
      where: { id: categoryId },
      data: fields,
    });
  });
