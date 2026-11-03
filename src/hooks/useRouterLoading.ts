import { useRouterState } from "@tanstack/react-router";

/** Returns true while the router is loading a navigation or reloading route data. */
export function useRouterLoading(): boolean {
  return useRouterState({
    select: (state) => state.isLoading || state.status === "pending",
  });
}
