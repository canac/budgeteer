import { lazy, Suspense } from "react";
import type { TransferModalProps } from "~/components/TransferModal";

const TransferModal = lazy(() =>
  import("~/components/TransferModal").then(({ TransferModal }) => ({
    default: TransferModal,
  })),
);

export function DynamicTransferModal(props: TransferModalProps) {
  return (
    <Suspense>
      <TransferModal {...props} />
    </Suspense>
  );
}
