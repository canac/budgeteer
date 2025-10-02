import { createServerFn } from "@tanstack/react-start";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  categoryId: string(),
  name: string().min(1).optional(),
  fund: boolean().optional(),
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
