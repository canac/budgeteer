import { lazy, Suspense } from "react";
import type { RuleModalProps } from "~/components/RuleModal";

export const preloadRuleModal = () => import("~/components/RuleModal");

const RuleModal = lazy(() => preloadRuleModal().then(({ RuleModal }) => ({ default: RuleModal })));

export function DynamicRuleModal(props: RuleModalProps) {
  return (
    <Suspense>
      <RuleModal {...props} />
    </Suspense>
  );
}
