import { createServerFn } from "@tanstack/react-start";
import { object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  categoryId: string(),
});

export const deleteCategory = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { categoryId } }) => {
    await prisma.category.delete({
      where: { id: categoryId },
    });
  });
