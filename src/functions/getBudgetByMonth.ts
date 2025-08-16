import { createServerFn } from "@tanstack/react-start";
import { prisma } from "~/lib/prisma";

export const getBudgetByMonth = createServerFn()
  .validator((data: string) => data)
  .handler(async ({ data: month }) => {
    if (!/^\d{2}-\d{4}$/.test(month)) {
      throw new Response("Invalid month format", { status: 400 });
    }
    const budget = await prisma.budget.findFirst({
      where: {
        month,
      },
      include: {
        categories: true,
        budgetFunds: { include: { fund: true } },
      },
    });
    if (!budget) {
      throw new Response("Budget not found", { status: 404 });
    }
    return budget;
  });
