import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

export function useServerFnData<T>(
  serverFn: ({ signal }: { signal: AbortSignal }) => Promise<T>,
): T | undefined {
  const loadData = useServerFn(serverFn);
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    const abortController = new AbortController();
    loadData({ signal: abortController.signal })
      .then((result) => setData(result))
      .catch((error) => {
        if (!abortController.signal.aborted) {
          throw error;
        }
      });

    return () => {
      abortController.abort();
    };
  }, [loadData]);

  return data;
}
