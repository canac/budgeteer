import type { ModalProps } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";

export interface UseOpenedOptions {
  onClose: () => void;
}

export interface UseOpenedResult {
  close: () => void;
  modalProps: Pick<ModalProps, "opened" | "onClose" | "onExitTransitionEnd">;
}

export function useOpened({ onClose }: UseOpenedOptions): UseOpenedResult {
  const [opened, setOpened] = useState(false);

  const close = useCallback(() => setOpened(false), []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpened(true));

    return () => {
      cancelAnimationFrame(id);
      setOpened(false);
    };
  }, []);

  const modalProps = {
    opened,
    onClose: close,
    onExitTransitionEnd: onClose,
  };

  return { close, modalProps };
}
