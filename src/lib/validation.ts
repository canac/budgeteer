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

export async function validateTransactionDate(date: string, categoryIds: string[]): Promise<void> {
  const transactionMonth = date.slice(0, 7);
  const invalidCategory = await prisma.category.findFirst({
    where: {
      id: { in: categoryIds },
      OR: [{ createdMonth: { gt: transactionMonth } }, { deletedMonth: { lte: transactionMonth } }],
    },
    select: { id: true },
  });
  if (invalidCategory) {
    throw new Error(
      "Cannot create transaction: it has categories that don't exist at the transaction date",
    );
  }
}
