import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";
import { object, number, string } from "zod";

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
