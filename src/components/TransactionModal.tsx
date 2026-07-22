import {
  Alert,
  Autocomplete,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useState } from "react";
import { extractErrorMessage } from "src/lib/error";
import { boolean, minLength, number, object, positive, refine, string } from "zod/mini";
import { createTransaction } from "~/functions/createTransaction";
import { editTransaction } from "~/functions/editTransaction";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { getFirstMonth } from "~/functions/getFirstMonth";
import { getVendors } from "~/functions/getVendors";
import { useCategorySplit } from "~/hooks/useCategorySplit";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import {
  CATEGORY_TOTAL_MISMATCH,
  categorySplitFields,
  splitTotalPennies,
} from "~/lib/categorySplit";
import { pluck } from "~/lib/collections";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { toISODateString } from "~/lib/iso";

interface EditTransaction {
  id: string;
  amount: number;
  vendor: string;
  description: string | null;
  date: string;
  externalId: string | null;
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

const amountSchema = number("Amount is required").check(
  positive("Amount must not be greater than zero"),
);

const formSchema = object({
  amount: amountSchema,
  vendor: string().check(minLength(1, "Vendor is required")),
  description: string(),
  date: string("Date is required"),
  isIncome: boolean(),
  ...categorySplitFields,
}).check(
  refine(
    (values) => splitTotalPennies(values.categoryAmounts) === dollarsToPennies(values.amount),
    {
      message: CATEGORY_TOTAL_MISMATCH,
      path: ["categoryAmounts"],
    },
  ),
);

export function TransactionModal({
  onClose,
  onSave,
  editingTransaction,
  initialCategoryId,
}: TransactionModalProps) {
  const vendors = useServerFnData(getVendors) ?? [];
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const firstMonth = useServerFnData(getFirstMonth);
  const { close, modalProps } = useOpened({ onClose });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = !!editingTransaction;
  const external = !!editingTransaction?.externalId;

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: isEditing
      ? {
          amount: penniesToDollars(Math.abs(editingTransaction.amount)),
          vendor: editingTransaction.vendor,
          description: editingTransaction.description ?? "",
          date: editingTransaction.date,
          isIncome: editingTransaction.amount > 0,
          selectedCategoryIds: pluck(editingTransaction.transactionCategories, "id"),
          categoryAmounts: editingTransaction.transactionCategories.map((category) => ({
            categoryId: category.id,
            amount: penniesToDollars(Math.abs(category.amount)),
          })),
        }
      : {
          amount: 0,
          vendor: "",
          description: "",
          date: toISODateString(new Date()),
          isIncome: false,
          selectedCategoryIds: initialCategoryId ? [initialCategoryId] : [],
          categoryAmounts: initialCategoryId ? [{ categoryId: initialCategoryId, amount: 0 }] : [],
        },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const { selectedCategoryIds, amount } = form.getValues();

  const { categorySelect, splitFields } = useCategorySplit({ form, categories, total: amount });

  form.watch("amount", ({ value }) => {
    if (selectedCategoryIds.length === 1 && value > 0) {
      form.setFieldValue("categoryAmounts", [
        { categoryId: selectedCategoryIds[0]!, amount: value },
      ]);
    }
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const sign = values.isIncome ? 1 : -1;
    const transaction = {
      amount: sign * dollarsToPennies(values.amount),
      vendor: values.vendor,
      description: values.description || undefined,
      date: values.date,
      categories: values.categoryAmounts.map((categoryAmount) => ({
        ...categoryAmount,
        amount: sign * dollarsToPennies(categoryAmount.amount),
      })),
    };

    try {
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
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
      return;
    }

    form.reset();
    close();
    onSave();
  });

  return (
    <Modal
      {...modalProps}
      title={<Text fw="bold">{isEditing ? "Edit Transaction" : "New Transaction"}</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Switch
            label="Income"
            key={form.key("isIncome")}
            {...form.getInputProps("isIncome", { type: "checkbox" })}
            disabled={external}
          />
          <NumberInput
            label="Amount"
            key={form.key("amount")}
            {...form.getInputProps("amount")}
            min={0}
            required
            disabled={external}
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
            disabled={external}
            min={firstMonth ?? undefined}
          />
          {categorySelect}
          {splitFields}
          {errorMessage !== null && <Alert color="red">{errorMessage}</Alert>}
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
