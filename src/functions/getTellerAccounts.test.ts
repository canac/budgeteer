import { createTellerAccount, createTellerEnrollment } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getTellerAccounts } from "./getTellerAccounts.ts";

describe("getTellerAccounts", () => {
  it("returns accounts ordered by institution then name", async () => {
    const enrollment = { connect: { id: (await createTellerEnrollment()).id } };

    await Promise.all([
      createTellerAccount({ name: "Savings", institution: "Chase", enrollment }),
      createTellerAccount({ name: "Checking", institution: "BofA", enrollment }),
      createTellerAccount({ name: "Checking", institution: "Chase", enrollment }),
    ]);

    const accounts = await getTellerAccounts();

    expect(accounts.map(({ institution, name }) => [institution, name])).toEqual([
      ["BofA", "Checking"],
      ["Chase", "Checking"],
      ["Chase", "Savings"],
    ]);
  });
});
