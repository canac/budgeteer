import { lazy, Suspense } from "react";
import type { TransactionModalProps } from "~/components/TransactionModal";

const TransactionModal = lazy(() =>
  import("~/components/TransactionModal").then(({ TransactionModal }) => ({
    default: TransactionModal,
  })),
);

export function DynamicTransactionModal(props: TransactionModalProps) {
  return (
    <Suspense>
      <TransactionModal {...props} />
    </Suspense>
  );
}
