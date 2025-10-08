import { createServerFn } from "@tanstack/react-start";
import { object, string, enum as zodEnum } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  categoryId: string(),
  name: string().min(1).optional(),
  type: zodEnum(["SAVINGS", "ACCUMULATING", "NON_ACCUMULATING"]).optional(),
});

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, ...fields } }) => {
    await prisma.category.update({
      where: {
        id: categoryId,
        // The type of fixed categories cannot be changed
        ...(fields.type && { type: { not: "FIXED" } }),
      },
      data: fields,
    });
  });
