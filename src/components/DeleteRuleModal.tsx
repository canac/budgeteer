import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useOpened } from "~/hooks/useOpened";
import { formatSignedCurrency } from "~/lib/formatters";

export interface DeleteRuleModalProps {
  onClose: () => void;
  onDelete: () => Promise<void>;
  vendor: string;
  amount?: number;
  amountRuleCount: number;
}

export function DeleteRuleModal({
  onClose,
  onDelete,
  vendor,
  amount,
  amountRuleCount,
}: DeleteRuleModalProps) {
  const { close, modalProps } = useOpened({ onClose });

  const handleDeleteConfirm = async () => {
    close();
    await onDelete();
  };

  return (
    <Modal {...modalProps} title={<Text fw="bold">Delete Rule</Text>}>
      <Stack gap="md">
        <Text>
          Are you sure you want to delete the rule for "{vendor}"
          {amount === undefined ? "" : ` at ${formatSignedCurrency(amount)}`}?
        </Text>
        {amountRuleCount > 0 && (
          <Text c="red">
            Its {amountRuleCount} amount rule{amountRuleCount === 1 ? "" : "s"} will be deleted too.
          </Text>
        )}
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={close}>
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
