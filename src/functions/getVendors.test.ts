import { subMonths } from "date-fns";
import { createTransaction } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { toISODateString } from "~/lib/iso";
import { getVendors } from "./getVendors.ts";

describe("getVendors", () => {
  it("returns all distinct vendors when no range is given", async () => {
    await Promise.all([
      createTransaction({ vendor: "Old", date: "2020-01-01" }),
      createTransaction({ vendor: "Recent", date: toISODateString(new Date()) }),
      createTransaction({ vendor: "Recent", date: toISODateString(new Date()) }),
    ]);

    expect(await getVendors()).toEqual(["Old", "Recent"]);
  });

  it("filters by the given month range", async () => {
    await Promise.all([
      createTransaction({ vendor: "Old", date: "2020-01-01" }),
      createTransaction({ vendor: "Recent", date: toISODateString(subMonths(new Date(), 1)) }),
    ]);

    expect(await getVendors({ data: { months: 3 } })).toEqual(["Recent"]);
  });
});
