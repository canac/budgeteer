import type { NotificationData } from "@mantine/notifications";
import { lazy, Suspense, useSyncExternalStore } from "react";

const Notifications = lazy(() =>
  import("@mantine/notifications").then(({ Notifications }) => ({ default: Notifications })),
);

let enabled = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Renders the notification container once the first notification is shown. */
export function LazyNotifications() {
  const show = useSyncExternalStore(
    subscribe,
    () => enabled,
    () => false,
  );

  return (
    show && (
      <Suspense>
        <Notifications />
      </Suspense>
    )
  );
}

export async function showNotification(data: NotificationData) {
  if (!enabled) {
    enabled = true;
    listeners.forEach((listener) => listener());
  }

  const { notifications } = await import("@mantine/notifications");
  notifications.show(data);
}
