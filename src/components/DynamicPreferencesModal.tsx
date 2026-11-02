import { lazy, Suspense } from "react";
import type { PreferencesModalProps } from "~/components/PreferencesModal";

const PreferencesModal = lazy(() =>
  import("~/components/PreferencesModal").then(({ PreferencesModal }) => ({
    default: PreferencesModal,
  })),
);

export function DynamicPreferencesModal(props: PreferencesModalProps) {
  return (
    <Suspense>
      <PreferencesModal {...props} />
    </Suspense>
  );
}
