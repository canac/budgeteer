import { useMantineColorScheme } from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { useDeviceOverride } from "~/hooks/useDeviceOverride";

interface UseDarkModeResult {
  darkMode: boolean;
  followsDevice: boolean;
  toggleDarkMode: () => void;
}

export function useDarkMode(): UseDarkModeResult {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { value, followsDevice, toggle } = useDeviceOverride({
    device: useColorScheme() === "dark",
    override: colorScheme === "auto" ? undefined : colorScheme === "dark",
    setOverride: (dark) => setColorScheme(dark ? "dark" : "light"),
    clearOverride: () => setColorScheme("auto"),
  });

  return {
    darkMode: value,
    followsDevice,
    toggleDarkMode: toggle,
  };
}
