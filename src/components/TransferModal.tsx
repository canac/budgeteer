import {
  ActionIcon,
  Alert,
  Button,
  Fieldset,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { IconSwitch } from "@tabler/icons-react";
import { useParams } from "@tanstack/react-router";
import { endOfMonth, parseISO } from "date-fns";
import { number, object, positive, refine, string } from "zod/mini";
import type { DeleteTransactionModalProps } from "~/components/DeleteTransactionModal";
import {
  DynamicDeleteTransactionModal,
  preloadDeleteTransactionModal,
} from "~/components/DynamicDeleteTransactionModal";
import { ModalFooter } from "~/components/ModalFooter";
import { createTransfer } from "~/functions/createTransfer";
import { editTransfer } from "~/functions/editTransfer";
import { getCategoriesWithBalances } from "~/functions/getCategoriesWithBalances";
import { useConfirmDelete } from "~/hooks/useConfirmDelete";
import { useOpened } from "~/hooks/useOpened";
import { useServerFnData } from "~/hooks/useServerFnData";
import { useSortedCategories } from "~/hooks/useSortedCategories";
import { useToday } from "~/hooks/useToday";
import { activeCategories } from "~/lib/activeCategories";
import { dollarsToPennies, penniesToDollars } from "~/lib/currencyConversion";
import { formatCurrency, fullDateFormatter } from "~/lib/formatters";
import { toISODateString, toISOMonthString } from "~/lib/iso";
import { preloadOnHover } from "~/lib/preloadOnHover";

const formSchema = object({
  amount: number("Amount is required").check(positive("Amount must be greater than zero")),
  sourceCategoryId: string("Source is required"),
  destinationCategoryId: string("Destination is required"),
  description: string(),
}).check(
  refine((values) => values.sourceCategoryId !== values.destinationCategoryId, {
    message: "Source and destination categories must be different",
    path: ["destinationCategoryId"],
  }),
);

export interface EditTransfer {
  id: string;
  amount: number;
  date: string;
  description: string | null;
  /** Null for leftovers transfers */
  sourceCategoryId: string | null;
  destinationCategoryId: string;
  /** The transfer's transaction, which deleting removes */
  transaction: DeleteTransactionModalProps["transaction"];
}

export interface TransferModalProps {
  onClose: () => void;
  onSave: () => void;
  sourceCategoryId?: string;
  editingTransfer?: EditTransfer;
  /** Shows a Delete button for the editing transfer. Called after the user confirms. */
  onDelete?: () => Promise<void>;
  /** Disables every field and explains why. */
  readOnlyReason?: string;
}

export function TransferModal({
  onClose,
  onSave,
  sourceCategoryId,
  editingTransfer,
  onDelete,
  readOnlyReason,
}: TransferModalProps) {
  const month = useParams({
    from: "/_layout/budget/$month",
    shouldThrow: false,
    select: (params) => params.month,
  });
  const categories = useServerFnData(getCategoriesWithBalances) ?? [];
  const { close, modalProps } = useOpened({ onClose });
  const deletion = useConfirmDelete({ close, onDelete });
  const today = useToday();

  const isEditing = !!editingTransfer;

  const transferDate = editingTransfer
    ? parseISO(editingTransfer.date)
    : endOfMonth(typeof month === "string" ? parseISO(month) : today);

  const sortedCategories = useSortedCategories(
    activeCategories(categories, toISOMonthString(transferDate)),
  );

  const form = useForm({
    validateInputOnBlur: true,
    initialValues: {
      amount: editingTransfer ? penniesToDollars(editingTransfer.amount) : 0,
      sourceCategoryId: editingTransfer?.sourceCategoryId ?? sourceCategoryId ?? null,
      destinationCategoryId: editingTransfer?.destinationCategoryId ?? null,
      description: editingTransfer?.description ?? "",
    },
    validate: schemaResolver(formSchema, { sync: true }),
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

  const handleSwitch = () => {
    form.setFieldValue("sourceCategoryId", form.values.destinationCategoryId);
    form.setFieldValue("destinationCategoryId", form.values.sourceCategoryId);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    const amount = dollarsToPennies(values.amount);
    const description = values.description.trim() || null;

    if (editingTransfer) {
      await editTransfer({
        data: {
          id: editingTransfer.id,
          amount,
          description,
        },
      });
    } else {
      await createTransfer({
        data: {
          amount,
          date: toISODateString(transferDate),
          sourceCategoryId: values.sourceCategoryId,
          destinationCategoryId: values.destinationCategoryId,
          description,
        },
      });
    }

    close();
    onSave();
  });

  return (
    <Modal
      {...modalProps}
      {...deletion.modalProps}
      title={
        <Text fw="bold">
          {readOnlyReason ? "Transfer" : isEditing ? "Edit Transfer" : "New Transfer"}
        </Text>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack>
          {readOnlyReason && <Alert>{readOnlyReason}</Alert>}
          <Fieldset variant="unstyled" disabled={!!readOnlyReason}>
            <Stack>
              <NumberInput
                label="Amount"
                key={form.key("amount")}
                {...form.getInputProps("amount")}
                min={0}
                required
              />
              <Select
                label="Source"
                data={categoryOptions}
                key={form.key("sourceCategoryId")}
                {...form.getInputProps("sourceCategoryId")}
                error={form.errors.sourceCategoryId}
                placeholder={isEditing ? "Leftovers" : undefined}
                required
                searchable
                disabled={isEditing}
              />
              {!isEditing && (
                <Group justify="center">
                  <ActionIcon
                    variant="subtle"
                    size="lg"
                    onClick={handleSwitch}
                    title="Switch source and destination"
                    disabled={!form.values.sourceCategoryId && !form.values.destinationCategoryId}
                  >
                    <IconSwitch />
                  </ActionIcon>
                </Group>
              )}
              <Select
                label="Destination"
                data={categoryOptions.filter(
                  (option) => option.value !== form.values.sourceCategoryId,
                )}
                key={form.key("destinationCategoryId")}
                {...form.getInputProps("destinationCategoryId")}
                error={form.errors.destinationCategoryId}
                required
                searchable
                disabled={isEditing}
              />
              <TextInput
                label="Description"
                key={form.key("description")}
                {...form.getInputProps("description")}
              />
            </Stack>
          </Fieldset>
          <Text size="sm" c="dimmed">
            Transfer Date: {fullDateFormatter.format(transferDate)}
          </Text>
          <ModalFooter>
            {isEditing && onDelete && (
              <Button
                color="red"
                {...preloadOnHover(preloadDeleteTransactionModal)}
                onClick={deletion.confirm}
              >
                Delete
              </Button>
            )}
            {!readOnlyReason && (
              <Button type="submit" loading={form.submitting} disabled={!form.isValid()}>
                {isEditing ? "Update" : "Save"}
              </Button>
            )}
          </ModalFooter>
        </Stack>
      </form>
      {editingTransfer && deletion.confirming && (
        <DynamicDeleteTransactionModal
          onClose={deletion.cancel}
          transaction={editingTransfer.transaction}
          onDelete={deletion.handleDelete}
        />
      )}
    </Modal>
  );
}
