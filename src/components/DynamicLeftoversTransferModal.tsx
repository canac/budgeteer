import { lazy, Suspense } from "react";
import type { LeftoversTransferModalProps } from "~/components/LeftoversTransferModal";

const LeftoversTransferModal = lazy(() =>
  import("~/components/LeftoversTransferModal").then(({ LeftoversTransferModal }) => ({
    default: LeftoversTransferModal,
  })),
);

export function DynamicLeftoversTransferModal(props: LeftoversTransferModalProps) {
  return (
    <Suspense>
      <LeftoversTransferModal {...props} />
    </Suspense>
  );
}
