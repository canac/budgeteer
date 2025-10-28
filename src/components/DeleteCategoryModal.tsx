import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { Category } from "generated/prisma/client";
import { deleteCategory } from "~/functions/deleteCategory";
import { useOpened } from "~/hooks/useOpened";

export interface DeleteCategoryModalProps {
  onClose: () => void;
  category: Pick<Category, "id" | "name">;
  month: string;
  onDelete: () => void;
}

export function DeleteCategoryModal({
  onClose,
  category,
  month,
  onDelete,
}: DeleteCategoryModalProps) {
  const { close, modalProps } = useOpened({ onClose });

  const handleDeleteConfirm = async () => {
    await deleteCategory({
      data: { categoryId: category.id, month },
    });
    close();
    onDelete();
  };

  return (
    <Modal
      {...modalProps}
      title={<Text fw="bold">Delete Category</Text>}
      size="md"
      centered
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Text>Are you sure you want to delete the "{category.name}" category?</Text>
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
