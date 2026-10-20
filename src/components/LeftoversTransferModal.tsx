import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { endOfMonth, parseISO } from "date-fns";
import { object, string } from "zod/mini";
import { transferLeftovers } from "~/functions/transferLeftovers";
import { useOpened } from "~/hooks/useOpened";
import { useSortedCategories } from "~/hooks/useSortedCategories";
import { amountSignClassname, formatCurrency, fullDateFormatter } from "~/lib/formatters";

const formSchema = object({
  destinationCategoryId: string("Destination is required"),
});

export interface LeftoversTransferModalProps {
  month: string;
  leftovers: Array<{ categoryId: string; name: string; balance: number }>;
  funds: Array<{ id: string; name: string; balance: number }>;
  /** Destinations of the month's existing leftovers transfers, newest first */
  existingDestinationIds: string[];
  onClose: () => void;
  onSave: () => void;
}

export function LeftoversTransferModal({
  month,
  leftovers,
  funds,
  existingDestinationIds,
  onClose,
  onSave,
}: LeftoversTransferModalProps) {
  const { close, modalProps } = useOpened({ onClose });

  const total = leftovers.reduce((sum, { balance }) => sum + balance, 0);

  const sortedFunds = useSortedCategories(funds);
  const destinationOptions = sortedFunds.map((category) => ({
    value: category.id,
    label: `${category.name} (${formatCurrency(category.balance)})`,
  }));

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: { destinationCategoryId: existingDestinationIds[0] ?? null },
    validate: schemaResolver(formSchema, { sync: true }),
    transformValues: (values) => formSchema.parse(values),
  });

  const updating = existingDestinationIds.includes(form.values.destinationCategoryId ?? "");

  const handleSubmit = form.onSubmit(async ({ destinationCategoryId }) => {
    await transferLeftovers({ data: { month, destinationCategoryId } });
    close();
    onSave();
  });

  return (
    <Modal
      {...modalProps}
      title={<Text fw="bold">{updating ? "Update Leftovers Transfer" : "Transfer Leftovers"}</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Stack gap={4}>
            {leftovers.map(({ categoryId, name, balance }) => (
              <Group key={categoryId} justify="space-between">
                <Text>{name}</Text>
                <Text className={amountSignClassname(balance)}>{formatCurrency(balance)}</Text>
              </Group>
            ))}
            <Group justify="space-between">
              <Text fw="bold">Total</Text>
              <Text fw="bold" className={amountSignClassname(total)}>
                {formatCurrency(total)}
              </Text>
            </Group>
          </Stack>
          <Select
            label="Destination"
            data={destinationOptions}
            key={form.key("destinationCategoryId")}
            {...form.getInputProps("destinationCategoryId")}
            required
            searchable
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Transfer Date: {fullDateFormatter.format(endOfMonth(parseISO(month)))}
            </Text>
            <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
              {updating ? "Update" : "Save"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
