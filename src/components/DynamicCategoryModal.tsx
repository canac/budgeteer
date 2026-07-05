import { lazy, Suspense } from "react";
import type { CategoryModalProps } from "~/components/CategoryModal";

const CategoryModal = lazy(() =>
  import("~/components/CategoryModal").then(({ CategoryModal }) => ({
    default: CategoryModal,
  })),
);

export function DynamicCategoryModal(props: CategoryModalProps) {
  return (
    <Suspense>
      <CategoryModal {...props} />
    </Suspense>
  );
}
