import { getTopCategories } from "~/functions/getTopCategories";
import { useServerFnData } from "~/hooks/useServerFnData";

interface Category {
  id: string;
  name: string;
  balance: number;
}

export function useSortedCategories(categories: Category[]) {
  const topCategoryIds = useServerFnData(getTopCategories) ?? [];
  return categories.toSorted((category1, category2) => {
    const topIndex1 = topCategoryIds.indexOf(category1.id);
    const topIndex2 = topCategoryIds.indexOf(category2.id);
    return topIndex1 - topIndex2;
  });
}
