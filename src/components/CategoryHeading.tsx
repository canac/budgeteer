import type { ReactNode } from "react";
import type { Category } from "src/prisma/client";
import { Group, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPencil } from "@tabler/icons-react";
import type { Deletable } from "~/components/CategoryModal";
import { CategoryTypeIcons } from "~/components/CategoryTypeIcons";
import { DynamicCategoryModal, preloadCategoryModal } from "~/components/DynamicCategoryModal";
import { preloadOnHover } from "~/lib/preloadOnHover";
import classes from "./CategoryHeading.module.css";

export interface CategoryHeadingProps {
  category: Pick<Category, "id" | "name" | "accumulating" | "flexible">;
  deletable: Deletable;
  month: string;
  onSave: () => void;
  onDelete: () => void;
  /** Wraps the name button in the page's heading element. */
  renderHeading: (name: ReactNode) => ReactNode;
}

/** The category's heading and type icons. Clicking the name opens the edit modal. */
export function CategoryHeading({
  category,
  deletable,
  month,
  onSave,
  onDelete,
  renderHeading,
}: CategoryHeadingProps) {
  const [editModalOpen, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

  return (
    <Group gap={0} wrap="nowrap">
      {renderHeading(
        <UnstyledButton
          className={classes.button}
          title="Edit category"
          {...preloadOnHover(preloadCategoryModal)}
          onClick={openEditModal}
        >
          {category.name}
          <IconPencil className={classes.pencil} stroke={1.5} aria-hidden />
        </UnstyledButton>,
      )}
      <CategoryTypeIcons className={classes.typeIcons} category={category} size={28} />
      {editModalOpen && (
        <DynamicCategoryModal
          onClose={closeEditModal}
          onSave={onSave}
          month={month}
          editingCategory={category}
          deletable={deletable}
          onDelete={onDelete}
        />
      )}
    </Group>
  );
}
