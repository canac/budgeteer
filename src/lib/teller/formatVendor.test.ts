import { describe, expect, it } from "vitest";
import { formatTellerVendor } from "./formatVendor.ts";

describe("formatTellerVendor", () => {
  it("title-cases uppercase words", () => {
    expect(formatTellerVendor("AMAZON PRIME")).toBe("Amazon Prime");
  });

  it("preserves hyphenated words", () => {
    expect(formatTellerVendor("H-E-B")).toBe("H-E-B");
  });
});
