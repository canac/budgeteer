import { lazy, Suspense } from "react";
import type { PreferencesModalProps } from "~/components/PreferencesModal";

export const preloadPreferencesModal = () => import("~/components/PreferencesModal");

const PreferencesModal = lazy(() =>
  preloadPreferencesModal().then(({ PreferencesModal }) => ({
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
