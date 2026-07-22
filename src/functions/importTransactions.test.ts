import * as sync from "src/lib/plaid/sync";
import { createExternalAccount, createExternalConnection } from "test/mocks.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { importTransactions } from "./importTransactions.ts";

vi.mock("src/lib/plaid/sync", () => ({
  syncConnection: vi.fn<typeof sync.syncConnection>(),
}));

describe("importTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns imported counts across connections", async () => {
    vi.mocked(sync.syncConnection)
      .mockResolvedValueOnce({ imported: 3 })
      .mockResolvedValueOnce({ imported: 5 });

    await Promise.all([createExternalConnection(), createExternalConnection()]);

    expect(await importTransactions()).toEqual({ imported: 8, failed: 0 });
    expect(sync.syncConnection).toHaveBeenCalledTimes(2);
  });

  it("keeps importing when one connection fails, reporting the failure", async () => {
    vi.mocked(sync.syncConnection)
      .mockResolvedValueOnce({ imported: 4 })
      .mockRejectedValueOnce(new Error("boom"));

    await Promise.all([createExternalConnection(), createExternalConnection()]);

    expect(await importTransactions()).toEqual({ imported: 4, failed: 1 });
  });

  it("skips connections where every account is disabled", async () => {
    const connection = await createExternalConnection();
    await Promise.all([
      createExternalAccount({ connection: { connect: { id: connection.id } }, enabled: false }),
      createExternalAccount({ connection: { connect: { id: connection.id } }, enabled: false }),
    ]);

    expect(await importTransactions()).toEqual({ imported: 0, failed: 0 });
    expect(sync.syncConnection).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: connection.id }),
    );
  });
});
