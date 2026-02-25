import { Select } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import type { Category } from "~/prisma/client";
import "./CategorySelector.css";

interface CategorySelectorProps {
  categories: Pick<Category, "id" | "name">[];
  currentCategory: string | null;
}

export function CategorySelector({ categories, currentCategory }: CategorySelectorProps) {
  const router = useRouter();

  const options = categories.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const handleChange = (value: string | null) => {
    if (value) {
      router.navigate({ to: "/category/$category", params: { category: value } });
    }
  };

  return (
    <Select
      className="CategorySelector"
      data={options}
      value={currentCategory}
      onChange={handleChange}
      placeholder="Select Category"
      variant="subtle"
      color="white"
      size="lg"
      classNames={{
        section: "section",
        input: "input",
      }}
    />
  );
}
