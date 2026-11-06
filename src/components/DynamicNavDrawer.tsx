import { lazy, Suspense } from "react";
import type { NavDrawerProps } from "~/components/NavDrawer";

export const preloadNavDrawer = () => import("~/components/NavDrawer");

const NavDrawer = lazy(() =>
  preloadNavDrawer().then(({ NavDrawer }) => ({
    default: NavDrawer,
  })),
);

export function DynamicNavDrawer(props: NavDrawerProps) {
  return (
    <Suspense>
      <NavDrawer {...props} />
    </Suspense>
  );
}
