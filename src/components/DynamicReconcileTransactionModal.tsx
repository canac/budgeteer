import { lazy, Suspense } from "react";
import type { ReconcileTransactionModalProps } from "~/components/ReconcileTransactionModal";

export const preloadReconcileTransactionModal = () =>
  import("~/components/ReconcileTransactionModal");

const ReconcileTransactionModal = lazy(() =>
  preloadReconcileTransactionModal().then(({ ReconcileTransactionModal }) => ({
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
