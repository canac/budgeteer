import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExternalAccount, createExternalConnection } from "../../../test/mocks.ts";
import { importAllTransactions } from "./importAll.ts";
import * as sync from "./sync.ts";

vi.mock("./sync.ts", () => ({
  syncConnection: vi.fn<typeof sync.syncConnection>(),
}));

describe("importAllTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns imported counts across connections", async () => {
    vi.mocked(sync.syncConnection)
      .mockResolvedValueOnce({ imported: 3 })
      .mockResolvedValueOnce({ imported: 5 });

    await Promise.all([createExternalConnection(), createExternalConnection()]);

    expect(await importAllTransactions()).toEqual({ imported: 8, failed: 0 });
    expect(sync.syncConnection).toHaveBeenCalledTimes(2);
  });

  it("keeps importing when one connection fails, reporting the failure", async () => {
    vi.mocked(sync.syncConnection)
      .mockResolvedValueOnce({ imported: 4 })
      .mockRejectedValueOnce(new Error("boom"));

    await Promise.all([createExternalConnection(), createExternalConnection()]);

    expect(await importAllTransactions()).toEqual({ imported: 4, failed: 1 });
  });

  it("skips connections where every account is disabled", async () => {
    const connection = await createExternalConnection();
    await Promise.all([
      createExternalAccount({ connection: { connect: { id: connection.id } }, enabled: false }),
      createExternalAccount({ connection: { connect: { id: connection.id } }, enabled: false }),
    ]);

    expect(await importAllTransactions()).toEqual({ imported: 0, failed: 0 });
    expect(sync.syncConnection).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: connection.id }),
    );
  });
});
