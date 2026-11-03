import { lazy, Suspense } from "react";
import type { ReviewTransactionModalProps } from "~/components/ReviewTransactionModal";

export const preloadReviewTransactionModal = () => import("~/components/ReviewTransactionModal");

const ReviewTransactionModal = lazy(() =>
  preloadReviewTransactionModal().then(({ ReviewTransactionModal }) => ({
    default: ReviewTransactionModal,
  })),
);

export function DynamicReviewTransactionModal(props: ReviewTransactionModalProps) {
  return (
    <Suspense>
      <ReviewTransactionModal {...props} />
    </Suspense>
  );
}
