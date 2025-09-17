import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { format } from "date-fns";
import type { Transaction } from "generated/prisma/client";
import { deleteTransaction } from "~/functions/deleteTransaction";
import { useOpened } from "~/hooks/useOpened";

export interface DeleteTransactionModalProps {
  onClose: () => void;
  transaction: Pick<Transaction, "id" | "vendor" | "amount" | "date">;
  onDelete: () => Promise<void>;
}

export function DeleteTransactionModal({
  onClose,
  transaction,
  onDelete,
}: DeleteTransactionModalProps) {
  const { opened, close } = useOpened();

  const handleDeleteCancel = () => {
    onClose();
  };

  const handleDeleteConfirm = async () => {
    await deleteTransaction({
      data: { transactionId: transaction.id },
    });
    onClose();
    await onDelete();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      onExitTransitionEnd={onClose}
      title={<Text fw="bold">Delete Transaction</Text>}
      size="md"
      centered
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Text>
          Are you sure you want to delete the transaction "{transaction.vendor}" from{" "}
          {format(new Date(transaction.date), "MMM dd, yyyy")}?
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
