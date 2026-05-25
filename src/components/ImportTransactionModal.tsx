import {
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  CheckIcon,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";
import { formatTellerVendor } from "src/lib/teller/formatVendor";
import { array, boolean, minLength, number, object, string } from "zod/mini";
import type { UnreviewedTransaction } from "~/functions/getUnreviewedTransactions";
import { acceptTransaction } from "~/functions/acceptTransaction";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import { useSortedCategories } from "~/hooks/useSortedCategories";
import { find } from "~/lib/collections";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatters";
import "./TransactionModal.css";

export interface ImportTransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  transaction: UnreviewedTransaction;
}

const formSchema = object({
  vendor: string().check(minLength(1, "Vendor is required")),
  description: string(),
  selectedCategoryIds: array(string()).check(minLength(1, "At least one category is required")),
  categoryAmounts: array(
    object({
      categoryId: string(),
      amount: number(),
    }),
  ),
  updateRuleVendor: boolean(),
  updateRuleCategory: boolean(),
});

export function ImportTransactionModal({
  onClose,
  onSave,
  transaction,
}: ImportTransactionModalProps) {
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const sortedCategories = useSortedCategories(categories);
  const { close, modalProps } = useOpened({ onClose });

  const sign = transaction.amount < 0 ? -1 : 1;
  const totalDollars = penniesToDollars(Math.abs(transaction.amount));

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: {
      vendor: transaction.rule?.vendor ?? formatTellerVendor(transaction.vendor),
      description: "",
      selectedCategoryIds: transaction.rule?.category ? [transaction.rule.category.id] : [],
      categoryAmounts: transaction.rule?.category
        ? [{ categoryId: transaction.rule.category.id, amount: totalDollars }]
        : [],
      updateRuleVendor: true,
      updateRuleCategory: transaction.rule?.category !== null,
    },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const categoryOptions = sortedCategories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const { selectedCategoryIds, categoryAmounts } = form.getValues();

  form.watch("selectedCategoryIds", ({ value, previousValue }) => {
    if (value.length === 1) {
      form.setFieldValue("categoryAmounts", [{ categoryId: value[0]!, amount: totalDollars }]);
    } else if (value.length === 2 && previousValue.length === 1) {
      form.setFieldValue("categoryAmounts", [
        { categoryId: value[0]!, amount: 0 },
        { categoryId: value[1]!, amount: 0 },
      ]);
    } else {
      const newCategoryAmounts = value.map(
        (categoryId) =>
          find(categoryAmounts, "categoryId", categoryId) ?? {
            categoryId,
            amount: 0,
          },
      );
      form.setFieldValue("categoryAmounts", newCategoryAmounts);
    }
    if (value.length !== 1) {
      form.setFieldValue("updateRuleCategory", false);
    }
  });

  const remainingAmount =
    Math.abs(transaction.amount) -
    categoryAmounts.reduce((sum, category) => sum + dollarsToPennies(category.amount), 0);

  const assignRemainingAmount = (index: number) => {
    if (categoryAmounts[index]) {
      form.setFieldValue(
        `categoryAmounts.${index}.amount`,
        categoryAmounts[index].amount + penniesToDollars(remainingAmount),
      );
    }
  };

  const removeCategory = (index: number) => {
    const categoryId = categoryAmounts[index]?.categoryId;
    form.setFieldValue(
      "selectedCategoryIds",
      selectedCategoryIds.filter((id) => id !== categoryId),
    );
  };

  const handleSubmit = form.onSubmit(async (values) => {
    await acceptTransaction({
      data: {
        id: transaction.id,
        override: {
          vendor: values.vendor.trim(),
          description: values.description.trim() || undefined,
          categories: values.categoryAmounts.map(({ categoryId, amount }) => ({
            categoryId,
            amount: sign * dollarsToPennies(amount),
          })),
          updateRuleVendor: values.updateRuleVendor,
          updateRuleCategory: values.updateRuleCategory,
        },
      },
    });
    close();
    onSave();
  });

  const singleCategory = selectedCategoryIds.length === 1;

  return (
    <Modal {...modalProps} title={<Text fw="bold">Import Transaction</Text>}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput label="Teller Vendor" value={transaction.vendor} disabled />
          <Stack gap="xs">
            <TextInput
              label="Vendor"
              required
              key={form.key("vendor")}
              {...form.getInputProps("vendor")}
            />
            <Checkbox
              label="Update rule vendor"
              key={form.key("updateRuleVendor")}
              {...form.getInputProps("updateRuleVendor", { type: "checkbox" })}
            />
          </Stack>
          <TextInput
            label="Description"
            key={form.key("description")}
            {...form.getInputProps("description")}
          />
          <Stack gap="xs">
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
            <Checkbox
              label="Update rule category"
              disabled={!singleCategory}
              key={form.key("updateRuleCategory")}
              {...form.getInputProps("updateRuleCategory", { type: "checkbox" })}
            />
          </Stack>
          {selectedCategoryIds.length > 1 && (
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
                        key={form.key(`categoryAmounts.${index}.amount`)}
                        {...form.getInputProps(`categoryAmounts.${index}.amount`)}
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
          )}
          <Group justify="flex-end">
            <Button
              type="submit"
              loading={form.submitting}
              disabled={remainingAmount !== 0 || !form.isValid()}
            >
              Accept
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
