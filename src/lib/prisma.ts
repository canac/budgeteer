import { PrismaClient } from "../../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export async function getBudgetByMonth(month: string) {
  return prisma.budget.findFirst({
    where: {
      month,
    },
    include: {
      categories: true,
      funds: true,
    },
  });
}
