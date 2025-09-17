import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";
import { useLoaderData } from "@tanstack/react-router";
import { format } from "date-fns";
import { zod4Resolver } from "mantine-form-zod-resolver";
import type z from "zod/mini";
import { array, boolean, minLength, number, object, refine, string } from "zod/mini";
import { createTransaction } from "~/functions/createTransaction";
import { editTransaction } from "~/functions/editTransaction";
import { useOpened } from "~/hooks/useOpened";
import { formatCurrency } from "~/lib/formatCurrency";
import { roundCurrency } from "~/lib/roundCurrency";

interface EditTransaction {
  id: number;
  amount: number;
  vendor: string;
  description: string | null;
  date: Date;
  transactionCategories: Array<{
    id: number;
    amount: number;
  }>;
}

export interface TransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  editingTransaction?: EditTransaction;
  initialCategoryId?: number;
}

const amountSchema = number("Amount is required").check(
  refine((value) => value > 0, "Amount must not be zero"),
);

const formSchema = object({
  amount: amountSchema,
  vendor: string().check(minLength(1, "Vendor is required")),
  description: string(),
  date: string("Date is required"),
  isIncome: boolean(),
  selectedCategoryIds: array(string()).check(minLength(1, "At least one category is required")),
  categoryAmounts: array(
    object({
      categoryId: number(),
      amount: amountSchema,
    }),
  ),
}).check(
  refine(
    (values) => {
      const totalCategoryAmount = values.categoryAmounts.reduce(
        (sum, category) => sum + category.amount,
        0,
      );
      return roundCurrency(values.amount - totalCategoryAmount) === 0;
    },
    {
      message: "Category amounts must equal total amount",
      path: ["categoryAmounts"],
    },
  ),
);

type Schema = z.infer<typeof formSchema>;

export function TransactionModal({
  onClose,
  onSave,
  editingTransaction,
  initialCategoryId,
}: TransactionModalProps) {
  const { budgetCategories } = useLoaderData({ from: "/budget/$month" });
  const { opened, close } = useOpened();

  const isEditing = !!editingTransaction;

  const form = useForm<Schema>({
    validateInputOnBlur: true,
    initialValues: isEditing
      ? {
          amount: Math.abs(editingTransaction.amount),
          vendor: editingTransaction.vendor,
          description: editingTransaction.description || "",
          date: format(editingTransaction.date, "yyyy-MM-dd"),
          isIncome: editingTransaction.amount > 0,
          selectedCategoryIds: editingTransaction.transactionCategories.map((category) =>
            category.id.toString(),
          ),
          categoryAmounts: editingTransaction.transactionCategories.map((category) => ({
            categoryId: category.id,
            amount: Math.abs(category.amount),
          })),
        }
      : {
          amount: 0,
          vendor: "",
          description: "",
          date: format(new Date(), "yyyy-MM-dd"),
          isIncome: false,
          selectedCategoryIds: initialCategoryId ? [initialCategoryId.toString()] : [],
          categoryAmounts: initialCategoryId ? [{ categoryId: initialCategoryId, amount: 0 }] : [],
        },
    validate: zod4Resolver(formSchema),
  });

  const categoryOptions = budgetCategories.map((category) => ({
    value: category.categoryId.toString(),
    label: category.name,
  }));

  const { selectedCategoryIds, categoryAmounts, amount } = form.getValues();

  form.watch("selectedCategoryIds", ({ value, previousValue }) => {
    if (value.length === 1) {
      form.setFieldValue("categoryAmounts", [{ categoryId: Number(value[0]), amount }]);
    } else if (value.length === 2 && previousValue.length === 1) {
      form.setFieldValue("categoryAmounts", [
        { categoryId: Number(value[0]), amount: 0 },
        { categoryId: Number(value[1]), amount: 0 },
      ]);
    } else {
      const newCategoryAmounts = value.map(
        (categoryId) =>
          categoryAmounts.find((category) => category.categoryId.toString() === categoryId) ?? {
            categoryId: Number(categoryId),
            amount: 0,
          },
      );
      form.setFieldValue("categoryAmounts", newCategoryAmounts);
    }
  });

  form.watch("amount", ({ value }) => {
    if (selectedCategoryIds.length === 1 && value > 0) {
      form.setFieldValue("categoryAmounts", [
        { categoryId: Number(selectedCategoryIds[0]), amount: value },
      ]);
    }
  });

  const remainingAmount =
    amount - categoryAmounts.reduce((sum, category) => sum + category.amount, 0);

  const assignRemainingAmount = (index: number) => {
    form.setFieldValue(
      `categoryAmounts.${index}.amount`,
      categoryAmounts[index].amount + remainingAmount,
    );
  };

  const removeCategory = (index: number) => {
    const categoryId = categoryAmounts[index].categoryId.toString();
    form.setFieldValue(
      "selectedCategoryIds",
      selectedCategoryIds.filter((id) => id !== categoryId),
    );
  };

  const handleSubmit = form.onSubmit(async (values) => {
    const sign = values.isIncome ? 1 : -1;
    const transaction = {
      amount: sign * values.amount,
      vendor: values.vendor,
      description: values.description || undefined,
      date: new Date(values.date).toISOString(),
      categories: values.categoryAmounts.map((categoryAmount) => ({
        ...categoryAmount,
        amount: sign * categoryAmount.amount,
      })),
    };
    if (isEditing) {
      await editTransaction({
        data: {
          id: editingTransaction.id,
          ...transaction,
        },
      });
    } else {
      await createTransaction({
        data: transaction,
      });
    }

    form.reset();
    close();
    onSave();
  });

  return (
    <Modal
      opened={opened}
      onClose={close}
      onExitTransitionEnd={onClose}
      title={<Text fw="bold">{isEditing ? "Edit Transaction" : "New Transaction"}</Text>}
      size="md"
      centered
      closeOnClickOutside={false}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Switch
            label="Income"
            key={form.key("isIncome")}
            {...form.getInputProps("isIncome", { type: "checkbox" })}
          />
          <NumberInput
            label="Amount"
            leftSection="$"
            key={form.key("amount")}
            {...form.getInputProps("amount")}
            required
            min={0}
            decimalScale={2}
            fixedDecimalScale
          />
          <TextInput
            label="Vendor"
            key={form.key("vendor")}
            {...form.getInputProps("vendor")}
            required
          />
          <TextInput
            label="Description"
            key={form.key("description")}
            {...form.getInputProps("description")}
          />
          <TextInput
            type="date"
            label="Date"
            key={form.key("date")}
            {...form.getInputProps("date")}
            required
          />
          <MultiSelect
            label="Category"
            data={categoryOptions}
            key={form.key("selectedCategoryIds")}
            {...form.getInputProps("selectedCategoryIds")}
            required
            multiple
            searchable
            renderOption={({ option }) => {
              const category = budgetCategories.find(
                (category) => category.categoryId.toString() === option.value,
              );
              return category && `${option.label} (${formatCurrency(category.balance)})`;
            }}
          />
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
                const budgetCategory = budgetCategories.find(
                  (budgetCategory) => budgetCategory.categoryId === categoryAmount.categoryId,
                );
                return (
                  <Group key={categoryAmount.categoryId} gap="xs" align="flex-start">
                    <NumberInput
                      placeholder={`${budgetCategory?.name} amount`}
                      leftSection="$"
                      key={form.key(`categoryAmounts.${index}.amount`)}
                      {...form.getInputProps(`categoryAmounts.${index}.amount`)}
                      min={0}
                      decimalScale={2}
                      fixedDecimalScale
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeCategory(index)}
                      title="Remove category"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                    {remainingAmount !== 0 && (
                      <ActionIcon
                        variant="subtle"
                        color="green"
                        onClick={() => assignRemainingAmount(index)}
                        title="Assign remaining amount"
                      >
                        <IconCircleCheck size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                );
              })}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              {isEditing ? "Update" : "Save"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
