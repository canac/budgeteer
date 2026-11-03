import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

/** Returns false during the server render and hydration, then true. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}
