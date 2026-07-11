import * as sync from "src/lib/plaid/sync";
import { createExternalConnection } from "test/mocks.ts";
import { describe, expect, it, vi } from "vitest";
import { importTransactions } from "./importTransactions.ts";

vi.mock("src/lib/plaid/sync", () => ({
  syncConnection: vi.fn<typeof sync.syncConnection>(),
}));

describe("importTransactions", () => {
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
});
