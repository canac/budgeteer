import { describe, expect, it } from "vitest";
import { getPrisma } from "../../test/helpers.ts";
import { createExternalAccount } from "../../test/mocks.ts";
import { setExternalAccountArchived } from "./setExternalAccountArchived.ts";

describe("setExternalAccountArchived", () => {
  const prisma = getPrisma();

  it("archives and disables the account", async () => {
    const account = await createExternalAccount({ enabled: true });

    await setExternalAccountArchived({ data: { id: account.id, archived: true } });

    const updated = await prisma.externalAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.archived).toBe(true);
    expect(updated.enabled).toBe(false);
  });

  it("unarchives the account without enabling it", async () => {
    const account = await createExternalAccount({ archived: true, enabled: false });

    await setExternalAccountArchived({ data: { id: account.id, archived: false } });

    const updated = await prisma.externalAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(updated.archived).toBe(false);
    expect(updated.enabled).toBe(false);
  });
});
