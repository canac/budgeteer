import { array, minLength, number, object, positive, string } from "zod/mini";
import { find } from "~/lib/collections";
import { dollarsToPennies } from "~/lib/currencyConversion";

export interface CategoryAmount {
  categoryId: string;
  amount: number;
}

export interface CategorySplitFormValues {
  selectedCategoryIds: string[];
  categoryAmounts: CategoryAmount[];
}

/** The `selectedCategoryIds` + `categoryAmounts` fields shared by every transaction modal's form. */
export const categorySplitFields = {
  selectedCategoryIds: array(string()).check(minLength(1, "At least one category is required")),
  categoryAmounts: array(
    object({
      categoryId: string(),
      amount: number().check(positive("Amount must be greater than zero")),
    }),
  ),
};

/**
 * Recompute the per-category split when the selected category set changes:
 * a lone category takes the whole `total` (dollars), splitting from one to two clears both, and
 * any other change preserves existing amounts while zeroing newly added categories.
 */
export function reconcileCategoryAmounts({
  selectedCategoryIds,
  previousCategoryIds,
  categoryAmounts,
  total,
}: {
  selectedCategoryIds: string[];
  previousCategoryIds: string[];
  categoryAmounts: CategoryAmount[];
  total: number;
}): CategoryAmount[] {
  if (selectedCategoryIds.length === 1) {
    return [{ categoryId: selectedCategoryIds[0]!, amount: total }];
  }
  if (selectedCategoryIds.length === 2 && previousCategoryIds.length === 1) {
    return selectedCategoryIds.map((categoryId) => ({ categoryId, amount: 0 }));
  }
  return selectedCategoryIds.map(
    (categoryId) => find(categoryAmounts, "categoryId", categoryId) ?? { categoryId, amount: 0 },
  );
}

/** Sum of the category amounts (edited in dollars), in pennies. */
export function splitTotalPennies(categoryAmounts: CategoryAmount[]): number {
  return categoryAmounts.reduce((sum, category) => sum + dollarsToPennies(category.amount), 0);
}

/** Pennies of `totalPennies` not yet assigned to a category. */
export function remainingAmount(totalPennies: number, categoryAmounts: CategoryAmount[]): number {
  return totalPennies - splitTotalPennies(categoryAmounts);
}

/** Error surfaced when a split's category amounts don't add up to the transaction total. */
export const CATEGORY_TOTAL_MISMATCH = "Category amounts must equal total amount";
