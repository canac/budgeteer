import { getTopCategories } from "~/functions/getTopCategories";
import { useServerFnData } from "~/hooks/useServerFnData";

interface BudgetCategory {
  categoryId: string;
  name: string;
  balance: number;
}

export function useSortedBudgetCategories(budgetCategories: BudgetCategory[]) {
  const topCategoryIds = useServerFnData(getTopCategories) ?? [];
  return budgetCategories.toSorted((a, b) => {
    const aTopIndex = topCategoryIds.indexOf(a.categoryId);
    const bTopIndex = topCategoryIds.indexOf(b.categoryId);
    return aTopIndex - bTopIndex;
  });
}
