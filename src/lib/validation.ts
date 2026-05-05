import { prisma } from "./prisma";

type ValidationResult = { valid: true } | { valid: false; message: string };

const valid = (): ValidationResult => ({ valid: true });
const invalid = (message: string): ValidationResult => ({ valid: false, message });

const firstInvalid = (results: Array<ValidationResult>) =>
  results.find((result) => !result.valid) ?? valid();

/** Throw an error if the result is not valid */
export const ensureValid = (result: ValidationResult): void => {
  if (!result.valid) {
    throw new Error(result.message);
  }
};

export async function validateCategoryDeletion(
  categoryId: string,
  month: string,
): Promise<ValidationResult> {
  const results = await Promise.all([
    prisma.transactionCategory
      .findFirst({
        where: {
          categoryId,
          transaction: {
            date: { gte: month },
          },
        },
        select: { id: true },
      })
      .then((transaction) =>
        transaction
          ? invalid("Cannot delete categories with transactions in the current or future months")
          : valid(),
      ),
    prisma.categorizationRule
      .findFirst({
        where: { categoryId },
        select: { id: true },
      })
      .then((rule) =>
        rule ? invalid("Cannot delete categories used by a categorization rule") : valid(),
      ),
  ]);
  return firstInvalid(results);
}

export async function validateTransactionDate(
  date: string,
  categoryIds: string[],
): Promise<ValidationResult> {
  const transactionMonth = date.slice(0, 7);
  const invalidCategory = await prisma.category.findFirst({
    where: {
      id: { in: categoryIds },
      OR: [{ createdMonth: { gt: transactionMonth } }, { deletedMonth: { lte: transactionMonth } }],
    },
    select: { id: true },
  });
  return invalidCategory
    ? invalid(
        "Cannot create transaction: it has categories that don't exist at the transaction date",
      )
    : valid();
}
