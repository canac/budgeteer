import { prisma } from "./prisma";

export async function isCategoryDeletable(categoryId: string, month: string): Promise<boolean> {
  const transaction = await prisma.transactionCategory.findFirst({
    where: {
      categoryId,
      transaction: {
        date: { gte: month },
      },
    },
    select: { id: true },
  });
  return transaction === null;
}
