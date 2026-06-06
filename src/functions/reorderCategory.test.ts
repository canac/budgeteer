import { beforeEach, describe, expect, it } from "vitest";
import { pluck } from "~/lib/collections.ts";
import { getPrisma } from "../../test/helpers.ts";
import { reorderCategory } from "./reorderCategory.ts";

describe("reorderCategory", () => {
  const prisma = getPrisma();
  const month = "2025-01";

  describe("successful creation", () => {
    const getCategory = async (name: string) => {
      const category = await prisma.category.findFirstOrThrow({ where: { name } });
      return category.id;
    };

    const getNames = async () => {
      const categories = await prisma.category.findMany({
        where: {
          createdMonth: { lte: month },
          OR: [{ deletedMonth: null }, { deletedMonth: { gt: month } }],
        },
        orderBy: { sortOrder: "asc" },
      });
      return pluck(categories, "name");
    };

    beforeEach(async () => {
      await prisma.category.createMany({
        data: [
          { name: "Category 1", createdMonth: month, sortOrder: 1 },
          { name: "Category 2", createdMonth: month, sortOrder: 2 },
          { name: "Category 3", createdMonth: month, sortOrder: 3 },
          { name: "Category 4", createdMonth: month, sortOrder: 4 },
          { name: "Category 5", createdMonth: month, sortOrder: 5 },
        ],
      });
    });

    it("moves a category backwards", async () => {
      await reorderCategory({
        data: {
          month,
          categoryId: await getCategory("Category 3"),
          targetId: await getCategory("Category 2"),
          direction: "before",
        },
      });

      expect(await getNames()).toEqual([
        "Category 1",
        "Category 3",
        "Category 2",
        "Category 4",
        "Category 5",
      ]);
    });

    it("moves a category forwards", async () => {
      await reorderCategory({
        data: {
          month,
          categoryId: await getCategory("Category 3"),
          targetId: await getCategory("Category 4"),
          direction: "after",
        },
      });

      expect(await getNames()).toEqual([
        "Category 1",
        "Category 2",
        "Category 4",
        "Category 3",
        "Category 5",
      ]);
    });

    it("moves a category to the beginning", async () => {
      await reorderCategory({
        data: {
          month,
          categoryId: await getCategory("Category 3"),
          targetId: await getCategory("Category 1"),
          direction: "before",
        },
      });

      expect(await getNames()).toEqual([
        "Category 3",
        "Category 1",
        "Category 2",
        "Category 4",
        "Category 5",
      ]);
    });

    it("moves a category to the end", async () => {
      await reorderCategory({
        data: {
          month,
          categoryId: await getCategory("Category 3"),
          targetId: await getCategory("Category 5"),
          direction: "after",
        },
      });

      expect(await getNames()).toEqual([
        "Category 1",
        "Category 2",
        "Category 4",
        "Category 5",
        "Category 3",
      ]);
    });

    it("ignores categories from other months", async () => {
      await prisma.category.createMany({
        data: [
          { name: "Category 4a", createdMonth: "2025-02", sortOrder: 4.1 },
          { name: "Category 4b", createdMonth: "2024-01", deletedMonth: month, sortOrder: 4.2 },
        ],
      });

      await reorderCategory({
        data: {
          month,
          categoryId: await getCategory("Category 3"),
          targetId: await getCategory("Category 5"),
          direction: "before",
        },
      });

      expect(await getNames()).toEqual([
        "Category 1",
        "Category 2",
        "Category 4",
        "Category 3",
        "Category 5",
      ]);
    });
  });
});
