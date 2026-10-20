import { createServerFn } from "@tanstack/react-start";
import { number, object, string } from "zod";
import { requireAuth } from "~/lib/authMiddleware";
import { getPrisma } from "~/lib/prisma";

const inputSchema = object({
  month: string(),
  income: number().int().positive(),
});

export const setBudgetIncome = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .middleware([requireAuth])
  .handler(async ({ data: { month, income } }) => {
    await getPrisma().budget.updateMany({
      where: { month },
      data: { income },
    });
  });
