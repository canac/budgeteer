import type { Category } from "src/prisma/client";
import { ActionIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { DynamicCategoryModal } from "~/components/DynamicCategoryModal";
import { DynamicDeleteCategoryModal } from "~/components/DynamicDeleteCategoryModal";

type Deletable = { valid: true } | { valid: false; message: string };

export interface CategoryHeaderActionsProps {
  category: Pick<Category, "id" | "name" | "accumulating" | "flexible">;
  deletable: Deletable;
  month: string;
  size: string;
  onSave: () => void;
  onDelete: () => void;
}

export function CategoryHeaderActions({
  category,
  deletable,
  month,
  size,
  onSave,
  onDelete,
}: CategoryHeaderActionsProps) {
  const [editModalOpen, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  return (
    <>
      <ActionIcon variant="subtle" onClick={openEditModal} title="Edit category" size={size}>
        <IconPencil />
      </ActionIcon>
      <Tooltip label={!deletable.valid && deletable.message} disabled={deletable.valid}>
        <ActionIcon
          color="red"
          onClick={openDeleteModal}
          disabled={!deletable.valid}
          title="Delete category"
          size={size}
        >
          <IconTrash />
        </ActionIcon>
      </Tooltip>
      {editModalOpen && (
        <DynamicCategoryModal
          onClose={closeEditModal}
          onSave={onSave}
          month={month}
          editingCategory={category}
        />
      )}
      {deleteModalOpen && deletable.valid && (
        <DynamicDeleteCategoryModal
          onClose={closeDeleteModal}
          category={category}
          month={month}
          onDelete={onDelete}
        />
      )}
    </>
  );
}
