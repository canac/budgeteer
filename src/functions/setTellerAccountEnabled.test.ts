import { createTellerAccount } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { setTellerAccountEnabled } from "./setTellerAccountEnabled.ts";

describe("setTellerAccountEnabled", () => {
  const prisma = getPrisma();

  it("marks the account as disabled", async () => {
    const account = await createTellerAccount({ enabled: true });

    await setTellerAccountEnabled({ data: { id: account.id, enabled: false } });

    const updated = await prisma.tellerAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.enabled).toBe(false);
  });

  it("marks the account as enabled", async () => {
    const account = await createTellerAccount({ enabled: false });

    await setTellerAccountEnabled({ data: { id: account.id, enabled: true } });

    const updated = await prisma.tellerAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.enabled).toBe(true);
  });
});
