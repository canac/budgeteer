import { lazy, Suspense } from "react";
import type { NewTransferModalProps } from "~/components/NewTransferModal";

const NewTransferModal = lazy(() =>
  import("~/components/NewTransferModal").then(({ NewTransferModal }) => ({
    default: NewTransferModal,
  })),
);

export function DynamicNewTransferModal(props: NewTransferModalProps) {
  return (
    <Suspense>
      <NewTransferModal {...props} />
    </Suspense>
  );
}
