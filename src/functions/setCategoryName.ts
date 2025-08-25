import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  categoryId: number(),
  name: string().min(1),
});

export const setCategoryName = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { categoryId, name } }) => {
    await prisma.category.update({
      where: { id: categoryId },
      data: { name },
    });
  });
