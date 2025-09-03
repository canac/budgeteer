import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";
import { format } from "date-fns";
import { zod4Resolver } from "mantine-form-zod-resolver";
import type z from "zod";
import { array, number, object, string } from "zod";
import { createTransaction } from "~/functions/createTransaction";
import { formatCurrency } from "~/lib/formatCurrency";
import { roundCurrency } from "~/lib/roundCurrency";

interface Category {
  id: number;
  name: string;
  currentBalance: number;
}

interface NewTransactionModalProps {
  opened: boolean;
  onClose: () => void;
  categories: Category[];
  onTransactionCreated: () => void;
}

const amountSchema = number("Amount is required").refine(
  (value) => value > 0,
  "Amount must not be zero",
);

const formSchema = object({
  amount: amountSchema,
  vendor: string().min(1, "Vendor is required"),
  description: string(),
  date: string().min(1, "Date is required"),
  selectedCategoryIds: array(string()).min(1, "At least one category is required"),
  categoryAmounts: array(
    object({
      categoryId: number(),
      amount: amountSchema,
    }),
  ),
}).refine(
  (values) => {
    const totalCategoryAmount = values.categoryAmounts.reduce(
      (sum, category) => sum + category.amount,
      0,
    );
    return roundCurrency(values.amount - totalCategoryAmount);
  },
  {
    message: "Category amounts must equal total amount",
    path: ["categoryAmounts"],
  },
);

type Schema = z.infer<typeof formSchema>;

export function NewTransactionModal({
  opened,
  onClose,
  categories,
  onTransactionCreated,
}: NewTransactionModalProps) {
  const form = useForm<Schema>({
    validateInputOnBlur: true,
    initialValues: {
      amount: 0,
      vendor: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      selectedCategoryIds: [],
      categoryAmounts: [],
    },
    validate: zod4Resolver(formSchema),
  });

  const categoryOptions = categories.map((category) => ({
    value: category.id.toString(),
    label: `${category.name} (${formatCurrency(category.currentBalance)})`,
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
    await createTransaction({
      data: {
        amount: -values.amount,
        vendor: values.vendor,
        description: values.description || undefined,
        date: new Date(values.date).toISOString(),
        categories: values.categoryAmounts.map((categoryAmount) => ({
          ...categoryAmount,
          amount: -categoryAmount.amount,
        })),
      },
    });

    form.reset();
    onClose();
    onTransactionCreated();
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw="bold">New Transaction</Text>}
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
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
                  <Group key={categoryAmount.categoryId} gap="xs" align="flex-start">
                    <NumberInput
                      placeholder={`${category?.name} amount`}
                      leftSection="$"
                      key={form.key(`categoryAmounts.${index}.amount`)}
                      {...form.getInputProps(`categoryAmounts.${index}.amount`)}
                      min={0}
                      decimalScale={2}
                      fixedDecimalScale
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      variant="transparent"
                      color="red"
                      onClick={() => removeCategory(index)}
                      title="Remove category"
                    >
                      <IconTrash />
                    </ActionIcon>
                    {remainingAmount !== 0 && (
                      <ActionIcon
                        variant="transparent"
                        color="green"
                        onClick={() => assignRemainingAmount(index)}
                        title="Assign remaining amount"
                      >
                        <IconCircleCheck />
                      </ActionIcon>
                    )}
                  </Group>
                );
              })}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
