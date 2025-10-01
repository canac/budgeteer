import { getTopCategories } from "~/functions/getTopCategories";
import { useServerFnData } from "~/hooks/useServerFnData";

interface Category {
  id: string;
  name: string;
  balance: number;
}

export function useSortedCategories(categories: Category[]) {
  const topCategoryIds = useServerFnData(getTopCategories) ?? [];
  return categories.toSorted((a, b) => {
    const aTopIndex = topCategoryIds.indexOf(a.id);
    const bTopIndex = topCategoryIds.indexOf(b.id);
    return aTopIndex - bTopIndex;
  });
}
