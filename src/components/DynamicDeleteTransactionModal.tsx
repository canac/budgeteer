import { lazy, Suspense } from "react";
import type { DeleteTransactionModalProps } from "~/components/DeleteTransactionModal";

export const preloadDeleteTransactionModal = () => import("~/components/DeleteTransactionModal");

const DeleteTransactionModal = lazy(() =>
  preloadDeleteTransactionModal().then(({ DeleteTransactionModal }) => ({
    default: DeleteTransactionModal,
  })),
);

export function DynamicDeleteTransactionModal(props: DeleteTransactionModalProps) {
  return (
    <Suspense>
      <DeleteTransactionModal {...props} />
    </Suspense>
  );
}
