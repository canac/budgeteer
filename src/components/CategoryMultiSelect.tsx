import type { UseFormReturnType } from "@mantine/form";
import { CheckIcon, MultiSelect } from "@mantine/core";
import { useSortedCategories } from "~/hooks/useSortedCategories";
import { find } from "~/lib/collections";
import { formatCurrency } from "~/lib/formatters";
import type { CategorySplitFormValues } from "./CategorySplitFields";
import "./TransactionModal.css";

interface CategoryWithBalance {
  id: string;
  name: string;
  balance: number;
}

export interface CategoryMultiSelectProps {
  form: UseFormReturnType<CategorySplitFormValues>;
  categories: CategoryWithBalance[];
}

export function CategoryMultiSelect({ form, categories }: CategoryMultiSelectProps) {
  const sortedCategories = useSortedCategories(categories);
  const categoryOptions = sortedCategories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  return (
    <MultiSelect
      label="Category"
      data={categoryOptions}
      key={form.key("selectedCategoryIds")}
      {...form.getInputProps("selectedCategoryIds")}
      required
      searchable
      classNames={{ dropdown: "TransactionModal-dropdown" }}
      renderOption={({ option, checked }) => {
        const category = find(categories, "id", option.value);
        return (
          category && (
            <>
              {checked && <CheckIcon className="check-icon" />}
              {option.label} ({formatCurrency(category.balance)})
            </>
          )
        );
      }}
    />
  );
}
