import { Button, Modal, Stack, Text } from "@mantine/core";
import type { Category } from "~/prisma/client";
import { ModalFooter } from "~/components/ModalFooter";
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
    <Modal {...modalProps} title={<Text fw="bold">Delete Category</Text>}>
      <Stack>
        <Text>Are you sure you want to delete the "{category.name}" category?</Text>
        <ModalFooter>
          <Button variant="default" onClick={close}>
            Cancel
          </Button>
          <Button color="red" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </ModalFooter>
      </Stack>
    </Modal>
  );
}
