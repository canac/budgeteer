import { Modal, Stack, Switch, Text } from "@mantine/core";
import { useDarkMode } from "~/hooks/useDarkMode";
import { useOpened } from "~/hooks/useOpened";

export interface PreferencesModalProps {
  onClose: () => void;
}

export function PreferencesModal({ onClose }: PreferencesModalProps) {
  const { modalProps } = useOpened({ onClose });
  const darkMode = useDarkMode();

  return (
    <Modal {...modalProps} title={<Text fw="bold">Preferences</Text>}>
      <Stack gap="md">
        <DevicePreferenceSwitch
          label="Dark mode"
          checked={darkMode.darkMode}
          followsDevice={darkMode.followsDevice}
          onChange={darkMode.toggleDarkMode}
        />
      </Stack>
    </Modal>
  );
}

interface DevicePreferenceSwitchProps {
  label: string;
  checked: boolean;
  followsDevice: boolean;
  onChange: () => void;
}

function DevicePreferenceSwitch({
  label,
  checked,
  followsDevice,
  onChange,
}: DevicePreferenceSwitchProps) {
  return (
    <Switch
      label={label}
      description={followsDevice ? "Follows your device setting" : "Overrides your device setting"}
      checked={checked}
      onChange={onChange}
    />
  );
}
