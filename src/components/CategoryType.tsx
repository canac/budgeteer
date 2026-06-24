import { Fieldset, Group, Switch, Text } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { updateCategory } from "~/functions/updateCategory";
import { useSyncedState } from "~/hooks/useSyncedState";
import "./CategoryType.css";

interface CategoryTypeProps {
  categoryId: string;
  accumulating: boolean;
  flexible: boolean;
  onChange?: (values: { accumulating: boolean; flexible: boolean }) => void;
}

export function CategoryType({
  categoryId,
  accumulating: initialAccumulating,
  flexible: initialFlexible,
  onChange,
}: CategoryTypeProps) {
  const router = useRouter();
  const [accumulating, setAccumulating] = useSyncedState(initialAccumulating);
  const [flexible, setFlexible] = useSyncedState(initialFlexible);

  const handleChangeAccumulating = async (newAccumulating: boolean) => {
    setAccumulating(newAccumulating);
    onChange?.({ accumulating: newAccumulating, flexible });
    await updateCategory({ data: { categoryId, accumulating: newAccumulating } });
    await router.invalidate();
  };

  const handleChangeFlexible = async (newFlexible: boolean) => {
    setFlexible(newFlexible);
    onChange?.({ accumulating, flexible: newFlexible });
    await updateCategory({ data: { categoryId, flexible: newFlexible } });
    await router.invalidate();
  };

  return (
    <Fieldset
      className="CategoryType"
      legend={
        <Text span size="xs" fw="bold" c="dimmed" tt="uppercase">
          Category type
        </Text>
      }
      radius="md"
    >
      <Group gap="lg">
        <Switch
          label="Accumulating"
          checked={accumulating}
          onChange={(event) => handleChangeAccumulating(event.currentTarget.checked)}
        />
        <Switch
          label="Flexible"
          checked={flexible}
          onChange={(event) => handleChangeFlexible(event.currentTarget.checked)}
        />
      </Group>
    </Fieldset>
  );
}
