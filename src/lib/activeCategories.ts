interface CategoryMonths {
  createdMonth: string;
  deletedMonth?: string | null;
}

/** The categories that exist during the given "YYYY-MM" month. */
export function activeCategories<T extends CategoryMonths>(categories: T[], month: string): T[] {
  return categories.filter(
    (category) =>
      category.createdMonth <= month && (!category.deletedMonth || category.deletedMonth > month),
  );
}
