import { createCategorizationRule } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { deleteCategorizationRule } from "./deleteCategorizationRule.ts";

describe("deleteCategorizationRule", () => {
  const prisma = getPrisma();

  it("deletes the rule", async () => {
    const rule = await createCategorizationRule();

    await deleteCategorizationRule({ data: { id: rule.id } });

    expect(await prisma.categorizationRule.findUnique({ where: { id: rule.id } })).toBeNull();
  });
});
