import type { UseFormReturnType } from "@mantine/form";
import { Button, Group, Input, NumberInput, Stack, Text } from "@mantine/core";
import { find } from "~/lib/collections";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatters";

export interface CategorySplitFormValues {
  selectedCategoryIds: string[];
  categoryAmounts: { categoryId: string; amount: number }[];
}

interface NamedCategory {
  id: string;
  name: string;
}

export interface CategorySplitFieldsProps {
  form: UseFormReturnType<CategorySplitFormValues>;
  categories: NamedCategory[];
  remainingAmount: number;
}

export function CategorySplitFields({
  form,
  categories,
  remainingAmount,
}: CategorySplitFieldsProps) {
  const splitForm = form;
  const { selectedCategoryIds, categoryAmounts } = splitForm.getValues();
  if (selectedCategoryIds.length <= 1) {
    return null;
  }

  const assignablePennies = (amount: number) => {
    const currentPennies = dollarsToPennies(amount);
    return Math.max(0, currentPennies + remainingAmount) - currentPennies;
  };

  const assignRemainingAmount = (index: number) => {
    const categoryAmount = categoryAmounts[index];
    if (categoryAmount) {
      const newPennies =
        dollarsToPennies(categoryAmount.amount) + assignablePennies(categoryAmount.amount);
      splitForm.setFieldValue(`categoryAmounts.${index}.amount`, penniesToDollars(newPennies));
    }
  };

  return (
    <Stack gap="xs">
      <Text size="md" fw="bold">
        Split transaction
        {remainingAmount !== 0 && ` (${formatCurrency(remainingAmount)} remaining)`}
      </Text>
      {categoryAmounts.map((categoryAmount, index) => {
        const category = find(categories, "id", categoryAmount.categoryId);
        const assigned = assignablePennies(categoryAmount.amount);
        const assignLabel = `${assigned >= 0 ? "+" : "-"} ${formatCurrency(Math.abs(assigned))}`;
        return (
          category && (
            <Stack key={categoryAmount.categoryId} gap={4}>
              <Input.Label size="md" htmlFor={`split-amount-${categoryAmount.categoryId}`}>
                {category.name}
              </Input.Label>
              <Group gap="xs" align="flex-start">
                <NumberInput
                  id={`split-amount-${categoryAmount.categoryId}`}
                  key={splitForm.key(`categoryAmounts.${index}.amount`)}
                  {...splitForm.getInputProps(`categoryAmounts.${index}.amount`)}
                  min={0}
                  style={{ flex: 1 }}
                />
                {assigned !== 0 && (
                  <Button
                    size="md"
                    variant="outline"
                    miw={120}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                    onClick={() => assignRemainingAmount(index)}
                  >
                    {assignLabel}
                  </Button>
                )}
              </Group>
            </Stack>
          )
        );
      })}
    </Stack>
  );
}
