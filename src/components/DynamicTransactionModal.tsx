import { lazy, Suspense } from "react";
import type { TransactionModalProps } from "~/components/TransactionModal";

export const preloadTransactionModal = () => import("~/components/TransactionModal");

const TransactionModal = lazy(() =>
  preloadTransactionModal().then(({ TransactionModal }) => ({
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
