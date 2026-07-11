import { describe, expect, it } from "vitest";
import { createExternalAccount, createExternalConnection } from "../../test/mocks.ts";
import { getExternalAccounts } from "./getExternalAccounts.ts";

describe("getExternalAccounts", () => {
  it("returns accounts ordered by institution then name", async () => {
    const connection = { connect: { id: (await createExternalConnection()).id } };

    await Promise.all([
      createExternalAccount({ name: "Savings", institution: "Chase", connection }),
      createExternalAccount({ name: "Checking", institution: "BofA", connection }),
      createExternalAccount({ name: "Checking", institution: "Chase", connection }),
    ]);

    const accounts = await getExternalAccounts();

    expect(accounts.map(({ institution, name }) => [institution, name])).toEqual([
      ["BofA", "Checking"],
      ["Chase", "Checking"],
      ["Chase", "Savings"],
    ]);
  });
});
