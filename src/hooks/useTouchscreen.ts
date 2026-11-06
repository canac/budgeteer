import { useSyncExternalStore } from "react";

const query = "(pointer: coarse)";

const subscribe = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
};

/** Returns whether the primary pointer is a touchscreen, and false during the server render and hydration. */
export function useTouchscreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
