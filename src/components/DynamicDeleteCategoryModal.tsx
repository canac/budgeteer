import { lazy, Suspense } from "react";
import type { DeleteCategoryModalProps } from "~/components/DeleteCategoryModal";

const DeleteCategoryModal = lazy(() =>
  import("~/components/DeleteCategoryModal").then(({ DeleteCategoryModal }) => ({
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
