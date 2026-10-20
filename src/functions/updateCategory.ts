import { createServerFn } from "@tanstack/react-start";
import { boolean, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({
  categoryId: string(),
  name: string().min(1).optional(),
  accumulating: boolean().optional(),
  flexible: boolean().optional(),
});

export const updateCategory = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { categoryId, ...fields } }) => {
    await getPrisma().category.update({
      where: { id: categoryId },
      data: fields,
    });
  });
