import { lazy, Suspense } from "react";
import type { CategorizationRuleModalProps } from "~/components/CategorizationRuleModal";

const CategorizationRuleModal = lazy(() =>
  import("~/components/CategorizationRuleModal").then(({ CategorizationRuleModal }) => ({
    default: CategorizationRuleModal,
  })),
);

export function DynamicCategorizationRuleModal(props: CategorizationRuleModalProps) {
  return (
    <Suspense>
      <CategorizationRuleModal {...props} />
    </Suspense>
  );
}
