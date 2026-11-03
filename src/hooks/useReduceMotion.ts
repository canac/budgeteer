import { useLocalStorage, useReducedMotion } from "@mantine/hooks";
import { useDeviceOverride } from "~/hooks/useDeviceOverride";

interface UseReduceMotionResult {
  reduceMotion: boolean;
  followsDevice: boolean;
  toggleReduceMotion: () => void;
}

export function useReduceMotion(): UseReduceMotionResult {
  const [override, setOverride, removeOverride] = useLocalStorage<boolean | undefined>({
    key: "reduceMotion",
    defaultValue: undefined,
  });
  const { value, followsDevice, toggle } = useDeviceOverride({
    device: useReducedMotion(),
    override,
    setOverride,
    clearOverride: removeOverride,
  });

  return {
    reduceMotion: value,
    followsDevice,
    toggleReduceMotion: toggle,
  };
}
