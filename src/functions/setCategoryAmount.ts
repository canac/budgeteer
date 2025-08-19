import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";
import { object, number } from "zod";

const inputSchema = object({
  categoryId: number(),
  amount: number().min(0),
});

export const setCategoryAmount = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(async ({ data: { categoryId, amount } }) => {
    await prisma.category.update({
      where: { id: categoryId },
      data: { amount },
    });
  });
