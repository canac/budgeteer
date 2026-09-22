import { parseISO } from "date-fns";
import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./formatters.ts";

describe("formatRelativeDate", () => {
  const now = parseISO("2026-09-21");
  const format = (date: string) => formatRelativeDate(parseISO(date), now);

  it("names the same day", () => {
    expect(format("2026-09-21")).toBe("today");
  });

  it("names the previous day", () => {
    expect(format("2026-09-20")).toBe("yesterday");
  });

  it("counts days under a week", () => {
    expect(format("2026-09-18")).toBe("3 days ago");
    expect(format("2026-09-15")).toBe("6 days ago");
  });

  it("counts whole weeks from one week to four", () => {
    expect(format("2026-09-14")).toBe("last week");
    expect(format("2026-09-12")).toBe("last week");
    expect(format("2026-08-30")).toBe("3 weeks ago");
  });

  it("counts whole months once past four weeks", () => {
    expect(format("2026-08-14")).toBe("last month");
    expect(format("2026-06-12")).toBe("3 months ago");
    expect(format("2025-12-31")).toBe("8 months ago");
  });

  it("counts whole years once past twelve months", () => {
    expect(format("2025-07-02")).toBe("last year");
    expect(format("2020-03-01")).toBe("6 years ago");
  });
});
