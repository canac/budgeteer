import { describe, expect, it } from "vitest";
import { createExternalConnection } from "../../test/mocks.ts";
import { getExternalConnections } from "./getExternalConnections.ts";

describe("getExternalConnections", () => {
  it("returns connections ordered by institution with the reauthenticate flag", async () => {
    await Promise.all([
      createExternalConnection({ institution: "Citi", loginRequired: true }),
      createExternalConnection({ institution: "Capital One", loginRequired: false }),
    ]);

    const connections = await getExternalConnections();

    expect(connections.map((c) => [c.institution, c.loginRequired])).toEqual([
      ["Capital One", false],
      ["Citi", true],
    ]);
  });
});
