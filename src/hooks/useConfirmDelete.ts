import { useState } from "react";

interface UseConfirmDeleteOptions {
  /** Closes the edit modal. */
  close: () => void;
  onDelete?: () => unknown;
}

/** State for a delete confirmation modal stacked on top of an edit modal. */
export function useConfirmDelete({ close, onDelete }: UseConfirmDeleteOptions) {
  const [confirming, setConfirming] = useState(false);

  return {
    confirming,
    confirm: () => setConfirming(true),
    cancel: () => setConfirming(false),
    /** Closes the edit modal, then deletes. */
    handleDelete: async () => {
      close();
      await onDelete?.();
    },
    /** Spread onto the edit modal so Escape and focus go to the confirmation while it's open. */
    modalProps: { closeOnEscape: !confirming, trapFocus: !confirming },
  };
}
