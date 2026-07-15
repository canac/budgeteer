import type { UseFormReturnType } from "@mantine/form";
import type { ReactNode } from "react";
import type { CategorySplitFormValues } from "~/lib/categorySplit";
import { CategoryMultiSelect } from "~/components/CategoryMultiSelect";
import { CategorySplitFields } from "~/components/CategorySplitFields";
import { reconcileCategoryAmounts, remainingAmount } from "~/lib/categorySplit";
import { dollarsToPennies } from "~/lib/currencyConversion";

interface CategoryWithBalance {
  id: string;
  name: string;
  balance: number;
}

export interface UseCategorySplitOptions {
  form: UseFormReturnType<CategorySplitFormValues>;
  categories: CategoryWithBalance[];
  total: number;
  onCategoryChange?: (selectedCategoryIds: string[]) => void;
}

export interface UseCategorySplitResult {
  /** Unassigned pennies remaining */
  remainingAmount: number;

  /** The category select JSX node */
  categorySelect: ReactNode;

  /** The split fields JSX node */
  splitFields: ReactNode;
}

/**
 * Shared category-split behavior for transaction modals.
 */
export function useCategorySplit({
  form,
  categories,
  total,
  onCategoryChange,
}: UseCategorySplitOptions): UseCategorySplitResult {
  const { categoryAmounts } = form.getValues();

  form.watch("selectedCategoryIds", ({ value, previousValue }) => {
    form.setFieldValue(
      "categoryAmounts",
      reconcileCategoryAmounts({
        selectedCategoryIds: value,
        previousCategoryIds: previousValue,
        categoryAmounts,
        total,
      }),
    );
    onCategoryChange?.(value);
  });

  const remaining = remainingAmount(dollarsToPennies(total), categoryAmounts);

  return {
    remainingAmount: remaining,
    categorySelect: <CategoryMultiSelect form={form} categories={categories} />,
    splitFields: (
      <CategorySplitFields form={form} categories={categories} remainingAmount={remaining} />
    ),
  };
}
