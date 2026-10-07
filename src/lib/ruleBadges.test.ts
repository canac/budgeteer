import { describe, expect, it } from "vitest";
import { ruleBadgeLabels } from "./ruleBadges.ts";

describe("ruleBadgeLabels", () => {
  const dining = { category: { name: "Dining" }, amount: -845 };
  const fun = { category: { name: "Fun" }, amount: -400 };

  it("labels nothing for a rule with no outcome", () => {
    expect(ruleBadgeLabels(null)).toEqual([]);
  });

  it("labels a dismissal", () => {
    expect(ruleBadgeLabels({ type: "dismiss" })).toEqual(["Dismiss"]);
  });

  it("omits the amount of a split that takes the whole transaction", () => {
    expect(
      ruleBadgeLabels({
        type: "categorize",
        splits: [{ category: { name: "Dining" } }],
      }),
    ).toEqual(["Dining"]);
  });

  it("omits the amount of a lone split even when it has one", () => {
    expect(ruleBadgeLabels({ type: "categorize", splits: [dining] })).toEqual(["Dining"]);
  });

  it("includes each amount when a split has siblings", () => {
    expect(ruleBadgeLabels({ type: "categorize", splits: [dining, fun] })).toEqual([
      "Dining $8.45",
      "Fun $4.00",
    ]);
  });

  it("marks income splits with their sign", () => {
    expect(
      ruleBadgeLabels({
        type: "categorize",
        splits: [{ category: { name: "Refunds" }, amount: 500 }, dining],
      }),
    ).toEqual(["Refunds +$5.00", "Dining $8.45"]);
  });
});
