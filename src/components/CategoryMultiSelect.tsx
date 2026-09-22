import type { UseFormReturnType } from "@mantine/form";
import { CheckIcon, MultiSelect } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { parseISO } from "date-fns";
import { useRef } from "react";
import { useSortedCategories } from "~/hooks/useSortedCategories";
import { find } from "~/lib/collections";
import { formatCurrency, formatRelativeDate } from "~/lib/formatters";
import type { CategorySplitFormValues } from "./CategorySplitFields";
import "./TransactionModal.css";

const toOption = (category: CategoryWithBalance) => ({
  value: category.id,
  label: category.name,
});

interface CategoryWithBalance {
  id: string;
  name: string;
  balance: number;
}

interface CategorySuggestion {
  categoryId: string;
  date: string;
}

export interface CategoryMultiSelectProps {
  form: UseFormReturnType<CategorySplitFormValues>;
  categories: CategoryWithBalance[];
  suggestions?: CategorySuggestion[];
}

export function CategoryMultiSelect({
  form,
  categories,
  suggestions = [],
}: CategoryMultiSelectProps) {
  const sortedCategories = useSortedCategories(categories);

  const recent = suggestions.length > 1 ? suggestions : [];
  const suggestedDates = new Map(recent.map(({ categoryId, date }) => [categoryId, date]));
  const suggestedCategories = recent
    .map(({ categoryId }) => find(sortedCategories, "id", categoryId))
    .filter((category) => category !== null);

  const data =
    suggestedCategories.length > 0
      ? [
          {
            group: "Recent categories",
            items: suggestedCategories.map(toOption),
          },
          {
            group: "All categories",
            items: sortedCategories
              .filter((category) => !suggestedDates.has(category.id))
              .map(toOption),
          },
        ]
      : sortedCategories.map(toOption);

  const [opened, { open, close }] = useDisclosure(false);
  const hasPicked = useRef(false);

  return (
    <MultiSelect
      label="Category"
      data={data}
      key={form.key("selectedCategoryIds")}
      {...form.getInputProps("selectedCategoryIds")}
      required
      searchable
      dropdownOpened={opened}
      onDropdownOpen={open}
      onDropdownClose={close}
      onOptionSubmit={() => {
        if (!hasPicked.current) {
          // Optimize for the single-category case and close after the first pick
          hasPicked.current = true;
          close();
        }
      }}
      classNames={{
        dropdown: "TransactionModal-dropdown",
        groupLabel: "TransactionModal-groupLabel",
      }}
      renderOption={({ option, checked }) => {
        const category = find(categories, "id", option.value);
        const date = suggestedDates.get(option.value);
        return (
          category && (
            <div className="option-row">
              {checked && <CheckIcon className="check-icon" />}
              <span>
                {option.label} ({formatCurrency(category.balance)})
              </span>
              {date && <span className="option-date">{formatRelativeDate(parseISO(date))}</span>}
            </div>
          )
        );
      }}
    />
  );
}
