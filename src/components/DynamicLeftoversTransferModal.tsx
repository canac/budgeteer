import { lazy, Suspense } from "react";
import type { LeftoversTransferModalProps } from "~/components/LeftoversTransferModal";

export const preloadLeftoversTransferModal = () => import("~/components/LeftoversTransferModal");

const LeftoversTransferModal = lazy(() =>
  preloadLeftoversTransferModal().then(({ LeftoversTransferModal }) => ({
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
