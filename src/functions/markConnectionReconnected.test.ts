import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createExternalConnection } from "../../test/mocks.ts";
import { markConnectionReconnected } from "./markConnectionReconnected.ts";

describe("markConnectionReconnected", () => {
  const prisma = getPrisma();

  it("clears the loginRequired flag", async () => {
    const connection = await createExternalConnection({ loginRequired: true });

    await markConnectionReconnected({ data: { connectionId: connection.id } });

    const updated = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: connection.id },
    });
    expect(updated.loginRequired).toBe(false);
  });
});
