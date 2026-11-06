import { lazy, Suspense } from "react";
import type { DeleteCategoryModalProps } from "~/components/DeleteCategoryModal";

export const preloadDeleteCategoryModal = () => import("~/components/DeleteCategoryModal");

const DeleteCategoryModal = lazy(() =>
  preloadDeleteCategoryModal().then(({ DeleteCategoryModal }) => ({
    default: DeleteCategoryModal,
  })),
);

export function DynamicDeleteCategoryModal(props: DeleteCategoryModalProps) {
  return (
    <Suspense>
      <DeleteCategoryModal {...props} />
    </Suspense>
  );
}
