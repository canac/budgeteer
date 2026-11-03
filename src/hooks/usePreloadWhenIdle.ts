import { useEffect, useEffectEvent } from "react";
import { useRouterLoading } from "~/hooks/useRouterLoading";

/**
 * Calls `preload` whenever the router finishes loading and the browser is idle. `preload` must be
 * safe to call repeatedly, like a dynamic `import()`.
 */
export function usePreloadWhenIdle(preload: () => unknown): void {
  const loading = useRouterLoading();
  const runPreload = useEffectEvent(() => {
    void preload();
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
