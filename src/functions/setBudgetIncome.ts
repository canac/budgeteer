import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
  income: number().int().positive(),
});

export const setBudgetIncome = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data: { month, income } }) => {
    await prisma.budget.updateMany({
      where: { month },
      data: { income },
    });
  });
