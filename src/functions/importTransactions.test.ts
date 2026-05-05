import * as sync from "src/lib/teller/sync";
import { createTellerEnrollment } from "test/mocks.ts";
import { describe, expect, it, vi } from "vitest";
import { importTransactions } from "./importTransactions.ts";

vi.mock("src/lib/teller/sync", () => ({
  syncEnrollment: vi.fn<typeof sync.syncEnrollment>(),
}));

describe("importTransactions", () => {
  it("returns imported counts across enrollments", async () => {
    vi.mocked(sync.syncEnrollment)
      .mockResolvedValueOnce({ imported: 3 })
      .mockResolvedValueOnce({ imported: 5 });

    await Promise.all([createTellerEnrollment(), createTellerEnrollment()]);

    expect(await importTransactions()).toBe(8);
    expect(sync.syncEnrollment).toHaveBeenCalledTimes(2);
  });
});
