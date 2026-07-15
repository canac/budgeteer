import { describe, expect, it } from "vitest";
import { object, safeParse } from "zod/mini";
import {
  categorySplitFields,
  reconcileCategoryAmounts,
  remainingAmount,
  splitTotalPennies,
} from "./categorySplit.ts";

describe("categorySplitFields", () => {
  const schema = object(categorySplitFields);

  it("accepts a positive split naming at least one category", () => {
    const result = safeParse(schema, {
      selectedCategoryIds: ["a"],
      categoryAmounts: [{ categoryId: "a", amount: 50 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty category selection", () => {
    const result = safeParse(schema, { selectedCategoryIds: [], categoryAmounts: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive category amount", () => {
    const result = safeParse(schema, {
      selectedCategoryIds: ["a"],
      categoryAmounts: [{ categoryId: "a", amount: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("reconcileCategoryAmounts", () => {
  it("assigns the full total to the sole category when exactly one is selected", () => {
    expect(
      reconcileCategoryAmounts({
        selectedCategoryIds: ["a"],
        previousCategoryIds: [],
        categoryAmounts: [],
        total: 50,
      }),
    ).toEqual([{ categoryId: "a", amount: 50 }]);
  });

  it("resets both amounts to zero when splitting from one category to two", () => {
    expect(
      reconcileCategoryAmounts({
        selectedCategoryIds: ["a", "b"],
        previousCategoryIds: ["a"],
        categoryAmounts: [{ categoryId: "a", amount: 50 }],
        total: 50,
      }),
    ).toEqual([
      { categoryId: "a", amount: 0 },
      { categoryId: "b", amount: 0 },
    ]);
  });

  it("preserves existing amounts and zeroes a newly added category", () => {
    expect(
      reconcileCategoryAmounts({
        selectedCategoryIds: ["a", "b", "c"],
        previousCategoryIds: ["a", "b"],
        categoryAmounts: [
          { categoryId: "a", amount: 30 },
          { categoryId: "b", amount: 20 },
        ],
        total: 50,
      }),
    ).toEqual([
      { categoryId: "a", amount: 30 },
      { categoryId: "b", amount: 20 },
      { categoryId: "c", amount: 0 },
    ]);
  });

  it("preserves remaining amounts when a category is removed", () => {
    expect(
      reconcileCategoryAmounts({
        selectedCategoryIds: ["a", "c"],
        previousCategoryIds: ["a", "b", "c"],
        categoryAmounts: [
          { categoryId: "a", amount: 30 },
          { categoryId: "b", amount: 20 },
          { categoryId: "c", amount: 0 },
        ],
        total: 50,
      }),
    ).toEqual([
      { categoryId: "a", amount: 30 },
      { categoryId: "c", amount: 0 },
    ]);
  });
});

describe("splitTotalPennies", () => {
  it("sums category dollar amounts as pennies", () => {
    expect(
      splitTotalPennies([
        { categoryId: "a", amount: 10.5 },
        { categoryId: "b", amount: 5.25 },
      ]),
    ).toBe(1575);
  });
});

describe("remainingAmount", () => {
  it("returns the unassigned pennies of the total", () => {
    expect(remainingAmount(2000, [{ categoryId: "a", amount: 15 }])).toBe(500);
  });
});
