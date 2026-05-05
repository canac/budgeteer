import { lazy, Suspense } from "react";
import type { ImportTransactionModalProps } from "~/components/ImportTransactionModal";

const ImportTransactionModal = lazy(() =>
  import("~/components/ImportTransactionModal").then(({ ImportTransactionModal }) => ({
    default: ImportTransactionModal,
  })),
);

export function DynamicImportTransactionModal(props: ImportTransactionModalProps) {
  return (
    <Suspense>
      <ImportTransactionModal {...props} />
    </Suspense>
  );
}
