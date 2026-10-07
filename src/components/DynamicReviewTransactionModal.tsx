import { lazy, Suspense } from "react";
import type { ReviewTransactionModalProps } from "~/components/ReviewTransactionModal";

const ReviewTransactionModal = lazy(() =>
  import("~/components/ReviewTransactionModal").then(({ ReviewTransactionModal }) => ({
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
