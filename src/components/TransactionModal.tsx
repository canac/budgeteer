import {
  ActionIcon,
  Alert,
  Autocomplete,
  Button,
  CheckIcon,
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
import { format } from "date-fns";
import { zod4Resolver } from "mantine-form-zod-resolver";
import type z from "zod/mini";
import { array, boolean, minLength, number, object, positive, refine, string } from "zod/mini";
import { createTransaction } from "~/functions/createTransaction";
import { editTransaction } from "~/functions/editTransaction";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { getVendors } from "~/functions/getVendors";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import { useSortedCategories } from "~/hooks/useSortedCategories";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatCurrency";
import "./TransactionModal.css";

interface EditTransaction {
  id: string;
  amount: number;
  vendor: string;
  description: string | null;
  date: Date;
  transactionCategories: Array<{
    id: string;
    amount: number;
  }>;
}

export interface TransactionModalProps {
  onClose: () => void;
  onSave: () => void;
  editingTransaction?: EditTransaction;
  initialCategoryId?: string;
}

const amountSchema = number("Amount is required").check(positive("Amount must not be zero"));

const formSchema = object({
  amount: amountSchema,
  vendor: string().check(minLength(1, "Vendor is required")),
  description: string(),
  date: string("Date is required"),
  isIncome: boolean(),
  selectedCategoryIds: array(string()).check(minLength(1, "At least one category is required")),
  categoryAmounts: array(
    object({
      categoryId: string(),
      amount: amountSchema,
    }),
  ),
}).check(
  refine(
    (values) => {
      const totalCategoryAmount = values.categoryAmounts.reduce(
        (sum, category) => sum + dollarsToPennies(category.amount),
        0,
      );
      return dollarsToPennies(values.amount) === totalCategoryAmount;
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
  const vendors = useServerFnData(getVendors) ?? [];
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const sortedCategories = useSortedCategories(categories);
  const { close, modalProps } = useOpened({ onClose });

  const isEditing = !!editingTransaction;

  const form = useForm<Schema>({
    validateInputOnBlur: true,
    initialValues: isEditing
      ? {
          amount: penniesToDollars(Math.abs(editingTransaction.amount)),
          vendor: editingTransaction.vendor,
          description: editingTransaction.description || "",
          date: format(editingTransaction.date, "yyyy-MM-dd"),
          isIncome: editingTransaction.amount > 0,
          selectedCategoryIds: editingTransaction.transactionCategories.map(
            (category) => category.id,
          ),
          categoryAmounts: editingTransaction.transactionCategories.map((category) => ({
            categoryId: category.id,
            amount: penniesToDollars(Math.abs(category.amount)),
          })),
        }
      : {
          amount: 0,
          vendor: "",
          description: "",
          date: format(new Date(), "yyyy-MM-dd"),
          isIncome: false,
          selectedCategoryIds: initialCategoryId ? [initialCategoryId] : [],
          categoryAmounts: initialCategoryId ? [{ categoryId: initialCategoryId, amount: 0 }] : [],
        },
    validate: zod4Resolver(formSchema),
  });

  const categoryOptions = sortedCategories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const { selectedCategoryIds, categoryAmounts, amount } = form.getValues();

  form.watch("selectedCategoryIds", ({ value, previousValue }) => {
    if (value.length === 1) {
      form.setFieldValue("categoryAmounts", [{ categoryId: value[0], amount }]);
    } else if (value.length === 2 && previousValue.length === 1) {
      form.setFieldValue("categoryAmounts", [
        { categoryId: value[0], amount: 0 },
        { categoryId: value[1], amount: 0 },
      ]);
    } else {
      const newCategoryAmounts = value.map(
        (categoryId) =>
          categoryAmounts.find((category) => category.categoryId === categoryId) ?? {
            categoryId: categoryId,
            amount: 0,
          },
      );
      form.setFieldValue("categoryAmounts", newCategoryAmounts);
    }
  });

  form.watch("amount", ({ value }) => {
    if (selectedCategoryIds.length === 1 && value > 0) {
      form.setFieldValue("categoryAmounts", [
        { categoryId: selectedCategoryIds[0], amount: value },
      ]);
    }
  });

  const remainingAmount =
    dollarsToPennies(amount) -
    categoryAmounts.reduce((sum, category) => sum + dollarsToPennies(category.amount), 0);

  const assignRemainingAmount = (index: number) => {
    form.setFieldValue(
      `categoryAmounts.${index}.amount`,
      categoryAmounts[index].amount + remainingAmount,
    );
  };

  const removeCategory = (index: number) => {
    const categoryId = categoryAmounts[index].categoryId;
    form.setFieldValue(
      "selectedCategoryIds",
      selectedCategoryIds.filter((id) => id !== categoryId),
    );
  };

  const handleSubmit = form.onSubmit(async (values) => {
    const sign = values.isIncome ? 1 : -1;
    const transaction = {
      amount: sign * dollarsToPennies(values.amount),
      vendor: values.vendor,
      description: values.description || undefined,
      date: new Date(values.date),
      categories: values.categoryAmounts.map((categoryAmount) => ({
        ...categoryAmount,
        amount: sign * dollarsToPennies(categoryAmount.amount),
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
      {...modalProps}
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
          <Autocomplete
            label="Vendor"
            key={form.key("vendor")}
            {...form.getInputProps("vendor")}
            data={vendors}
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
            classNames={{ dropdown: "TransactionModal-dropdown" }}
            renderOption={({ option, checked }) => {
              const category = categories.find((category) => category.id === option.value);
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
                const category = categories.find(
                  (category) => category.id === categoryAmount.categoryId,
                );
                return (
                  category && (
                    <Group key={categoryAmount.categoryId} gap="xs" align="flex-start">
                      <NumberInput
                        placeholder={`${category.name} amount`}
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
                  )
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
