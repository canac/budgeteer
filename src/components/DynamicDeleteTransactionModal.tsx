import { lazy, Suspense } from "react";
import type { DeleteTransactionModalProps } from "~/components/DeleteTransactionModal";

const DeleteTransactionModal = lazy(() =>
  import("~/components/DeleteTransactionModal").then(({ DeleteTransactionModal }) => ({
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
