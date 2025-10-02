import { useRef, useState } from "react";

export function useSyncedState<T>(value: T) {
  const [state, setState] = useState(value);
  const prevValue = useRef(value);

  if (prevValue.current !== value) {
    prevValue.current = value;
    setState(value);
  }

  return [state, setState] as const;
}
