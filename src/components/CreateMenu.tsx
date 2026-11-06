import type { ReactElement } from "react";
import { Menu } from "@mantine/core";
import { IconArrowsExchange, IconReceipt } from "@tabler/icons-react";

export interface CreateMenuProps {
  target: ReactElement;
  defaultOpened: boolean;
  onNewTransaction: () => void;
  onNewTransfer: () => void;
}

export function CreateMenu({
  target,
  defaultOpened,
  onNewTransaction,
  onNewTransfer,
}: CreateMenuProps) {
  return (
    <Menu position="bottom-end" defaultOpened={defaultOpened}>
      <Menu.Target>{target}</Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconReceipt size={16} />} onClick={onNewTransaction}>
          New transaction
        </Menu.Item>
        <Menu.Item leftSection={<IconArrowsExchange size={16} />} onClick={onNewTransfer}>
          New transfer
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
