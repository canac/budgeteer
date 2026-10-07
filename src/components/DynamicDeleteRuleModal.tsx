import { lazy, Suspense } from "react";
import type { DeleteRuleModalProps } from "~/components/DeleteRuleModal";

const DeleteRuleModal = lazy(() =>
  import("~/components/DeleteRuleModal").then(({ DeleteRuleModal }) => ({
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
