import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createExternalAccount, externalConnection } from "../../test/mocks.ts";
import { setExternalAccountEnabled } from "./setExternalAccountEnabled.ts";

describe("setExternalAccountEnabled", () => {
  const prisma = getPrisma();

  it("marks the account as disabled without resetting the connection cursor", async () => {
    const account = await createExternalAccount({
      enabled: true,
      connection: { create: externalConnection({ cursor: "cursor-1" }) },
    });

    await setExternalAccountEnabled({ data: { id: account.id, enabled: false } });

    const updated = await prisma.externalAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.enabled).toBe(false);
    const connection = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: account.connectionId },
    });
    expect(connection.cursor).toBe("cursor-1");
  });

  it("marks the account as enabled and resets the connection cursor", async () => {
    const account = await createExternalAccount({
      enabled: false,
      connection: { create: externalConnection({ cursor: "cursor-1" }) },
    });

    await setExternalAccountEnabled({ data: { id: account.id, enabled: true } });

    const updated = await prisma.externalAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.enabled).toBe(true);
    const connection = await prisma.externalConnection.findUniqueOrThrow({
      where: { id: account.connectionId },
    });
    expect(connection.cursor).toBeNull();
  });
});
