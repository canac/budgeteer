import { Button, Group, Modal, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useLoaderData } from "@tanstack/react-router";
import { endOfMonth } from "date-fns";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { number, object, positive, refine, string } from "zod/mini";
import { createTransfer } from "~/functions/createTransfer";
import { useOpened } from "~/hooks/useOpened";
import { dollarsToPennies } from "~/lib/currencyConversion";
import { formatCurrency } from "~/lib/formatCurrency";

const formSchema = object({
  amount: number("Amount is required").check(positive("Amount must be greater than zero")),
  sourceCategoryId: string("Source is required"),
  destinationCategoryId: string("Destination is required"),
}).check(
  refine((values) => values.sourceCategoryId !== values.destinationCategoryId, {
    message: "Source and destination categories must be different",
    path: ["destinationCategoryId"],
  }),
);

type Schema = {
  amount: number;
  sourceCategoryId: string | null;
  destinationCategoryId: string | null;
};

export interface NewTransferModalProps {
  onClose: () => void;
  onSave: () => void;
  sourceCategoryId?: number;
}

export function NewTransferModal({ onClose, onSave, sourceCategoryId }: NewTransferModalProps) {
  const { budgetCategories, month } = useLoaderData({ from: "/budget/$month" });
  const { close, modalProps } = useOpened({ onClose });

  const form = useForm<Schema>({
    validateInputOnBlur: true,
    initialValues: {
      amount: 0,
      sourceCategoryId: sourceCategoryId?.toString() ?? null,
      destinationCategoryId: null,
    },
    validate: zod4Resolver(formSchema),
  });

  form.watch("sourceCategoryId", ({ value }) => {
    if (value === form.values.destinationCategoryId) {
      form.resetField("destinationCategoryId");
    }
  });

  const categoryOptions = budgetCategories.map((category) => ({
    value: category.categoryId.toString(),
    label: `${category.name} (${formatCurrency(category.balance)})`,
  }));

  const transferDate = endOfMonth(new Date(month));

  const handleSubmit = form.onSubmit(async (values) => {
    await createTransfer({
      data: {
        amount: dollarsToPennies(values.amount),
        sourceCategoryId: Number(values.sourceCategoryId),
        destinationCategoryId: Number(values.destinationCategoryId),
        date: transferDate,
      },
    });

    close();
    onSave();
  });

  return (
    <Modal
      {...modalProps}
      title={<Text fw="bold">New Transfer</Text>}
      size="md"
      centered
      closeOnClickOutside={false}
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
          <Select
            label="Source"
            data={categoryOptions}
            key={form.key("sourceCategoryId")}
            {...form.getInputProps("sourceCategoryId")}
            error={form.errors.sourceCategoryId}
            required
            searchable
          />
          <Select
            label="Destination"
            data={categoryOptions.filter((option) => option.value !== form.values.sourceCategoryId)}
            key={form.key("destinationCategoryId")}
            {...form.getInputProps("destinationCategoryId")}
            error={form.errors.destinationCategoryId}
            required
            searchable
          />
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
