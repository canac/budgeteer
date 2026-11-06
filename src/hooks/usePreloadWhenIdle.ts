import { useEffect, useEffectEvent } from "react";
import { useRouterLoading } from "~/hooks/useRouterLoading";

/**
 * Calls each of `preloads` whenever the router finishes loading and the browser is idle. Each must be
 * safe to call repeatedly, like a dynamic `import()`.
 */
export function usePreloadWhenIdle(...preloads: Array<() => unknown>): void {
  const loading = useRouterLoading();
  const runPreload = useEffectEvent(() => {
    for (const preload of preloads) {
      void preload();
    }
  });

  useEffect(() => {
    if (loading) {
      return undefined;
    }
    // Safari ships requestIdleCallback disabled by default
    if (typeof requestIdleCallback === "undefined") {
      const timeout = setTimeout(runPreload, 200);
      return () => clearTimeout(timeout);
    }
    const id = requestIdleCallback(runPreload, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }, [loading]);
}
