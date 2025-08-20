import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";
import { object, string, number } from "zod";

const inputSchema = object({
  budgetId: number(),
  name: string().min(1),
  initialBalance: number().min(0).default(0),
  budgetedAmount: number().min(0).default(0),
});

export const createFund = createServerFn()
  .validator((data) => inputSchema.parse(data))
  .handler(
    async ({ data: { budgetId, name, initialBalance, budgetedAmount } }) => {
      const fund = await prisma.fund.create({
        data: {
          name,
          initialBalance,
          budgetFunds: {
            create: {
              budgetedAmount,
              budgetId,
            },
          },
        },
      });
      return fund;
    },
  );
