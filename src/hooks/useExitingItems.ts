import { useState } from "react";
import { pluck } from "~/lib/collections";

export interface ExitingItem<T> {
  item: T;
  exiting: boolean;
  /** Changes when an exiting item comes back, so keying on it remounts the item fresh. */
  generation: number;
}

/**
 * Keeps items that disappear from `items` in place and flagged as exiting until `onExited` is
 * called with their key. Replacing the whole list, like changing pages, skips the exit.
 */
export function useExitingItems<T, K extends keyof T>(
  items: T[],
  key: K,
): [ExitingItem<T>[], (exitedKey: T[K]) => void] {
  const [previousItems, setPreviousItems] = useState(items);
  const [rendered, setRendered] = useState(() =>
    items.map((item) => ({ item, exiting: false, generation: 0 })),
  );

  if (previousItems !== items) {
    setPreviousItems(items);
    setRendered(mergeExiting(rendered, items, key));
  }

  const onExited = (exitedKey: T[K]) =>
    setRendered((previous) =>
      previous.filter(({ item, exiting }) => !exiting || item[key] !== exitedKey),
    );

  return [rendered, onExited];
}

function mergeExiting<T>(rendered: ExitingItem<T>[], items: T[], key: keyof T): ExitingItem<T>[] {
  const keys = new Set(pluck(items, key));
  const renderedByKey = new Map(rendered.map((entry) => [entry.item[key], entry]));
  const next = items.map((item) => {
    const existing = renderedByKey.get(item[key]);
    const generation = (existing?.generation ?? 0) + (existing?.exiting ? 1 : 0);
    return { item, exiting: false, generation };
  });

  const removed = rendered.filter(({ item, exiting }) => !exiting && !keys.has(item[key]));
  const anySurvived = rendered.some(({ item, exiting }) => !exiting && keys.has(item[key]));
  // Emptying the list by removing its last item still animates
  if (!anySurvived && (items.length > 0 || removed.length > 1)) {
    return next;
  }

  rendered.forEach((entry, i) => {
    if (!keys.has(entry.item[key])) {
      next.splice(Math.min(i, next.length), 0, { ...entry, exiting: true });
    }
  });
  return next;
}
