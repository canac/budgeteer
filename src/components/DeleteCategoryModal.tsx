import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { Category } from "generated/prisma/client";
import { deleteCategory } from "~/functions/deleteCategory";
import { useOpened } from "~/hooks/useOpened";

export interface DeleteCategoryModalProps {
  onClose: () => void;
  category: Pick<Category, "id" | "name">;
  onDelete: () => Promise<void>;
}

export function DeleteCategoryModal({ onClose, category, onDelete }: DeleteCategoryModalProps) {
  const { opened, close } = useOpened();

  const handleDeleteCancel = () => {
    onClose();
  };

  const handleDeleteConfirm = async () => {
    await deleteCategory({
      data: { categoryId: category.id },
    });
    onClose();
    await onDelete();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      onExitTransitionEnd={onClose}
      title={<Text fw="bold">Delete Category</Text>}
      size="md"
      centered
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Text>Are you sure you want to delete the "{category.name}" category?</Text>
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
