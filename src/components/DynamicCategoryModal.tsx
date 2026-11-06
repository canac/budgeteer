import { lazy, Suspense } from "react";
import type { CategoryModalProps } from "~/components/CategoryModal";

export const preloadCategoryModal = () => import("~/components/CategoryModal");

const CategoryModal = lazy(() =>
  preloadCategoryModal().then(({ CategoryModal }) => ({
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
