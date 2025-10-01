import { ActionIcon, Button, Group, Modal, NumberInput, Select, Stack, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconSwitch } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { endOfMonth, format, parse } from "date-fns";
import { zod4Resolver } from "mantine-form-zod-resolver";
import { number, object, positive, refine, string } from "zod/mini";
import { createTransfer } from "~/functions/createTransfer";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import { useSortedCategories } from "~/hooks/useSortedCategories";
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

export interface NewTransferModalProps {
  onClose: () => void;
  onSave: () => void;
  sourceCategoryId?: string;
}

export function NewTransferModal({ onClose, onSave, sourceCategoryId }: NewTransferModalProps) {
  const month = useParams({
    from: "/_layout/budget/$month",
    shouldThrow: false,
    select: (params) => params.month,
  });
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const sortedCategories = useSortedCategories(categories);
  const { close, modalProps } = useOpened({ onClose });

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: {
      amount: 0,
      sourceCategoryId: sourceCategoryId ?? null,
      destinationCategoryId: null as string | null,
    },
    validate: zod4Resolver(formSchema),
    transformValues: (values) => formSchema.parse(values),
  });

  form.watch("sourceCategoryId", ({ value }) => {
    if (value === form.values.destinationCategoryId) {
      form.resetField("destinationCategoryId");
    }
  });

  const categoryOptions = sortedCategories.map((category) => ({
    value: category.id,
    label: `${category.name} (${formatCurrency(category.balance)})`,
  }));

  const transferDate = endOfMonth(
    typeof month === "string" ? parse(month, "MM-yyyy", new Date()) : new Date(),
  );

  const handleSwitch = () => {
    form.setFieldValue("sourceCategoryId", form.values.destinationCategoryId);
    form.setFieldValue("destinationCategoryId", form.values.sourceCategoryId);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    await createTransfer({
      data: {
        amount: dollarsToPennies(values.amount),
        date: transferDate,
        sourceCategoryId: values.sourceCategoryId,
        destinationCategoryId: values.destinationCategoryId,
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
          <Group justify="center">
            <ActionIcon
              variant="subtle"
              onClick={handleSwitch}
              title="Switch source and destination"
              disabled={!form.values.sourceCategoryId && !form.values.destinationCategoryId}
            >
              <IconSwitch />
            </ActionIcon>
          </Group>
          <Select
            label="Destination"
            data={categoryOptions.filter((option) => option.value !== form.values.sourceCategoryId)}
            key={form.key("destinationCategoryId")}
            {...form.getInputProps("destinationCategoryId")}
            error={form.errors.destinationCategoryId}
            required
            searchable
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Transfer Date: {format(transferDate, "MMM dd, yyyy")}
            </Text>
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
