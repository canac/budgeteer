import { Group, Tooltip } from "@mantine/core";
import { IconPigMoney, IconWallet } from "@tabler/icons-react";
import type { Category } from "~/prisma/client";

interface CategoryTypeIconsProps {
  category: Pick<Category, "accumulating" | "flexible">;
  size?: number;
}

export function CategoryTypeIcons({
  category: { accumulating, flexible },
  size = 16,
}: CategoryTypeIconsProps) {
  if (!accumulating && !flexible) {
    return null;
  }

  return (
    <Group gap={4} c="dimmed">
      {accumulating && (
        <Tooltip label="Accumulating">
          <IconPigMoney size={size} stroke={1.5} />
        </Tooltip>
      )}
      {flexible && (
        <Tooltip label="Flexible">
          <IconWallet size={size} stroke={1.5} />
        </Tooltip>
      )}
    </Group>
  );
}
