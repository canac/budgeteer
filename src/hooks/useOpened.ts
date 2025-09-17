import { useCallback, useEffect, useState } from "react";

export interface UseOpenedResult {
  opened: boolean;
  close: () => void;
}

export function useOpened(): UseOpenedResult {
  const [opened, setOpened] = useState(false);

  const close = useCallback(() => setOpened(false), []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpened(true));

    return () => {
      cancelAnimationFrame(id);
      setOpened(false);
    };
  }, []);

  return { opened, close };
}
