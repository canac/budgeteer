import type { Category } from "src/prisma/client";
import { ActionIcon, Menu, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";
import { DynamicCategoryModal } from "~/components/DynamicCategoryModal";
import { DynamicDeleteCategoryModal } from "~/components/DynamicDeleteCategoryModal";

type Deletable = { valid: true } | { valid: false; message: string };

export interface CategoryHeaderActionsProps {
  category: Pick<Category, "id" | "name" | "accumulating" | "flexible">;
  deletable: Deletable;
  month: string;
  onSave: () => void;
  onDelete: () => void;
}

export function CategoryHeaderActions({
  category,
  deletable,
  month,
  onSave,
  onDelete,
}: CategoryHeaderActionsProps) {
  const [editModalOpen, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);
  const [deleteModalOpen, { open: openDeleteModal, close: closeDeleteModal }] =
    useDisclosure(false);

  return (
    <>
      <Menu position="bottom-end">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size={28} aria-label="Category actions">
            <IconDots />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconPencil size={16} />} onClick={openEditModal}>
            Edit category
          </Menu.Item>
          <Tooltip label={!deletable.valid && deletable.message} disabled={deletable.valid}>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              disabled={!deletable.valid}
              onClick={openDeleteModal}
            >
              Delete category
            </Menu.Item>
          </Tooltip>
        </Menu.Dropdown>
      </Menu>
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
