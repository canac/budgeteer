import { lazy, Suspense } from "react";
import type { ReconcileTransactionModalProps } from "~/components/ReconcileTransactionModal";

const ReconcileTransactionModal = lazy(() =>
  import("~/components/ReconcileTransactionModal").then(({ ReconcileTransactionModal }) => ({
    default: ReconcileTransactionModal,
  })),
);

export function DynamicReconcileTransactionModal(props: ReconcileTransactionModalProps) {
  return (
    <Suspense>
      <ReconcileTransactionModal {...props} />
    </Suspense>
  );
}
