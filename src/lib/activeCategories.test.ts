import { category } from "test/mocks.ts";
import { describe, expect, it } from "vitest";
import { activeCategories } from "./activeCategories.ts";

describe("activeCategories", () => {
  const month = "2025-06";

  it("includes a category created before the month and never deleted", () => {
    const existing = category({ createdMonth: "2025-01" });

    expect(activeCategories([existing], month)).toEqual([existing]);
  });

  it("includes a category created during the month", () => {
    const existing = category({ createdMonth: month });

    expect(activeCategories([existing], month)).toEqual([existing]);
  });

  it("excludes a category created after the month", () => {
    const future = category({ createdMonth: "2025-07" });

    expect(activeCategories([future], month)).toEqual([]);
  });

  it("excludes a category deleted during the month", () => {
    const deleted = category({ createdMonth: "2025-01", deletedMonth: month });

    expect(activeCategories([deleted], month)).toEqual([]);
  });

  it("excludes a category deleted before the month", () => {
    const deleted = category({ createdMonth: "2025-01", deletedMonth: "2025-03" });

    expect(activeCategories([deleted], month)).toEqual([]);
  });

  it("includes a category deleted after the month", () => {
    const deleted = category({ createdMonth: "2025-01", deletedMonth: "2025-09" });

    expect(activeCategories([deleted], month)).toEqual([deleted]);
  });

  it("preserves the order of the categories it keeps", () => {
    const first = category({ createdMonth: "2025-01" });
    const dropped = category({ createdMonth: "2025-12" });
    const last = category({ createdMonth: "2025-02" });

    expect(activeCategories([first, dropped, last], month)).toEqual([first, last]);
  });
});
