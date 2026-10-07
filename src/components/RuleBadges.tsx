import { Badge } from "@mantine/core";
import { IconBan } from "@tabler/icons-react";
import { type BadgeOutcome, ruleBadgeLabels } from "~/lib/ruleBadges";

interface RuleBadgesProps {
  outcome: BadgeOutcome;
}

export function RuleBadges({ outcome }: RuleBadgesProps) {
  const labels = ruleBadgeLabels(outcome);
  if (labels.length === 0) {
    return undefined;
  }

  const dismiss = outcome?.type === "dismiss";
  return labels.map((label) => (
    <Badge
      key={label}
      variant={dismiss ? "filled" : "light"}
      color={dismiss ? "dark" : "gray"}
      size="lg"
      tt="none"
      leftSection={dismiss ? <IconBan size={16} /> : undefined}
    >
      {label}
    </Badge>
  ));
}
