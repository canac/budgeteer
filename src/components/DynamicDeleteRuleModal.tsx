import { lazy, Suspense } from "react";
import type { DeleteRuleModalProps } from "~/components/DeleteRuleModal";

export const preloadDeleteRuleModal = () => import("~/components/DeleteRuleModal");

const DeleteRuleModal = lazy(() =>
  preloadDeleteRuleModal().then(({ DeleteRuleModal }) => ({
    default: DeleteRuleModal,
  })),
);

export function DynamicDeleteRuleModal(props: DeleteRuleModalProps) {
  return (
    <Suspense>
      <DeleteRuleModal {...props} />
    </Suspense>
  );
}
