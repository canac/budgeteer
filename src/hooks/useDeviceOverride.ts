interface UseDeviceOverrideOptions {
  /** The device setting. */
  device: boolean;
  /** The saved override, or undefined when the device setting decides. */
  override: boolean | undefined;
  setOverride: (value: boolean) => void;
  clearOverride: () => void;
}

interface UseDeviceOverrideResult {
  value: boolean;
  /** True when the device setting decides, false when an override saved here does. */
  followsDevice: boolean;
  /** Flips the value. Flipping back to the device setting clears the override. */
  toggle: () => void;
}

/**
 * A two-state toggle that follows the device setting by default and saves an
 * override only while it differs from the device. Toggling back to match the
 * device clears the override, so later device changes apply again.
 *
 * @see https://lea.verou.me/blog/2026/dark-mode-toggles-2/
 */
export function useDeviceOverride({
  device,
  override,
  setOverride,
  clearOverride,
}: UseDeviceOverrideOptions): UseDeviceOverrideResult {
  const value = override ?? device;

  const toggle = () => {
    if (!value === device) {
      clearOverride();
    } else {
      setOverride(!value);
    }
  };

  return {
    value,
    followsDevice: override === undefined,
    toggle,
  };
}
