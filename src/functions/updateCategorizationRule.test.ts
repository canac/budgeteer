import { createCategorizationRule, createCategory } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { updateCategorizationRule } from "./updateCategorizationRule.ts";

describe("updateCategorizationRule", () => {
  const prisma = getPrisma();

  const vendor = "Amazon";

  it("updates the vendor and category", async () => {
    const [category, rule] = await Promise.all([createCategory(), createCategorizationRule()]);

    await updateCategorizationRule({
      data: { id: rule.id, vendor, categoryId: category.id },
    });

    const updated = await prisma.categorizationRule.findUniqueOrThrow({ where: { id: rule.id } });
    expect(updated).toMatchObject({ vendor, categoryId: category.id });
  });

  it("clears the category when categoryId is null", async () => {
    const category = await createCategory();
    const rule = await createCategorizationRule({ category: { connect: { id: category.id } } });

    await updateCategorizationRule({
      data: { id: rule.id, vendor, categoryId: null },
    });

    const updated = await prisma.categorizationRule.findUniqueOrThrow({ where: { id: rule.id } });
    expect(updated.categoryId).toBeNull();
  });
});
