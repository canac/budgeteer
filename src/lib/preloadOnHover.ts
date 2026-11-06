type Preload = () => unknown;

/** Event props that call `preload` (or each function in it) when the element is hovered or focused. */
export function preloadOnHover(preload: Preload | Preload[]) {
  const handler = () => {
    for (const callback of Array.isArray(preload) ? preload : [preload]) {
      void callback();
    }
  };
  return { onPointerEnter: handler, onFocus: handler };
}
