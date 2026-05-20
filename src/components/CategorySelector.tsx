import { ScrollArea } from "@mantine/core";
import type { Category } from "~/prisma/client";
import { MantineNavLink } from "./MantineNavLink";

interface CategorySelectorProps {
  categories: Pick<Category, "id" | "name">[];
  currentCategory: string | null;
  onNavigate?: () => void;
}

export function CategorySelector({
  categories,
  currentCategory,
  onNavigate,
}: CategorySelectorProps) {
  return (
    <ScrollArea.Autosize mah={220} type="scroll">
      {categories.map((category) => (
        <MantineNavLink
          key={category.id}
          to="/category/$category"
          params={{ category: category.id }}
          label={category.name}
          active={category.id === currentCategory}
          onClick={onNavigate}
        />
      ))}
    </ScrollArea.Autosize>
  );
}
