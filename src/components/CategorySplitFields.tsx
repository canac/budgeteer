import type { UseFormReturnType } from "@mantine/form";
import { ActionIcon, Alert, Group, NumberInput, Stack, Text } from "@mantine/core";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";
import { find } from "~/lib/collections";
import { penniesToDollars } from "~/lib/currencyConversion";
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

  const assignRemainingAmount = (index: number) => {
    const categoryAmount = categoryAmounts[index];
    if (categoryAmount) {
      splitForm.setFieldValue(
        `categoryAmounts.${index}.amount`,
        categoryAmount.amount + penniesToDollars(remainingAmount),
      );
    }
  };

  const removeCategory = (index: number) => {
    const categoryId = categoryAmounts[index]?.categoryId;
    splitForm.setFieldValue(
      "selectedCategoryIds",
      selectedCategoryIds.filter((id) => id !== categoryId),
    );
  };

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Split transaction
      </Text>
      {remainingAmount !== 0 && (
        <Alert color={remainingAmount > 0 ? "orange" : "red"}>
          {remainingAmount > 0
            ? `${formatCurrency(remainingAmount)} remaining to assign`
            : `${formatCurrency(Math.abs(remainingAmount))} over budget`}
        </Alert>
      )}
      {categoryAmounts.map((categoryAmount, index) => {
        const category = find(categories, "id", categoryAmount.categoryId);
        return (
          category && (
            <Group key={categoryAmount.categoryId} gap="xs" align="center">
              <NumberInput
                label={category.name}
                key={splitForm.key(`categoryAmounts.${index}.amount`)}
                {...splitForm.getInputProps(`categoryAmounts.${index}.amount`)}
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => removeCategory(index)}
                title="Remove category"
              >
                <IconTrash />
              </ActionIcon>
              {remainingAmount !== 0 && (
                <ActionIcon
                  variant="subtle"
                  color="green"
                  onClick={() => assignRemainingAmount(index)}
                  title="Assign remaining amount"
                >
                  <IconCircleCheck />
                </ActionIcon>
              )}
            </Group>
          )
        );
      })}
    </Stack>
  );
}
