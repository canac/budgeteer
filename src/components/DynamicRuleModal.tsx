import { lazy, Suspense } from "react";
import type { RuleModalProps } from "~/components/RuleModal";

const RuleModal = lazy(() =>
  import("~/components/RuleModal").then(({ RuleModal }) => ({ default: RuleModal })),
);

export function DynamicRuleModal(props: RuleModalProps) {
  return (
    <Suspense>
      <RuleModal {...props} />
    </Suspense>
  );
}
