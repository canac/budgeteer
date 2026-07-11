import { pluck } from "src/lib/collections.ts";
import { createCategorizationRule, createCategory } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getCategorizationRules } from "./getCategorizationRules.ts";

describe("getCategorizationRules", () => {
  it("returns rules sorted by externalVendor", async () => {
    const category = await createCategory({ name: "Groceries" });
    await Promise.all([
      createCategorizationRule({ externalVendor: "VENDOR B" }),
      createCategorizationRule({
        externalVendor: "VENDOR A",
        category: { connect: { id: category.id } },
      }),
    ]);

    expect(pluck(await getCategorizationRules(), "externalVendor")).toEqual([
      "VENDOR A",
      "VENDOR B",
    ]);
  });
});
