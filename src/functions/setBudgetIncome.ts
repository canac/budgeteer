import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { prisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
  income: number().int().positive(),
});

export const setBudgetIncome = createServerFn({ method: "POST" })
  .inputValidator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, income } }) => {
    await prisma.budget.updateMany({
      where: { month },
      data: { income },
    });
  });
