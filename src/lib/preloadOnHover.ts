type Preload = () => unknown;

export interface PreloadOnHoverOptions {
  /** Also preload when the element is focused. Defaults to `true`. */
  onFocus?: boolean;
}

/** Event props that call `preload` (or each function in it) when the element is hovered or, optionally, focused. */
export function preloadOnHover(
  preload: Preload | Preload[],
  { onFocus = true }: PreloadOnHoverOptions = {},
) {
  const handler = () => {
    for (const callback of Array.isArray(preload) ? preload : [preload]) {
      void callback();
    }
  };
  return {
    onPointerEnter: handler,
    ...(onFocus && { onFocus: handler }),
  };
}
