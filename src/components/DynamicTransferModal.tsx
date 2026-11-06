import { lazy, Suspense } from "react";
import type { TransferModalProps } from "~/components/TransferModal";

export const preloadTransferModal = () => import("~/components/TransferModal");

const TransferModal = lazy(() =>
  preloadTransferModal().then(({ TransferModal }) => ({
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
