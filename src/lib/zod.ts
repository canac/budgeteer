import { NEVER, string } from "zod";
import { monthToDate, type Month } from "./month";

export function monthString() {
  return string().regex(/^\d{2}-\d{4}$/, "Invalid month format");
}

export function month() {
  return monthString().transform((monthString, ctx) => {
    const [monthPart, yearPart] = monthString.split("-");
    const month = parseInt(monthPart, 10);
    const year = parseInt(yearPart, 10);

    if (month < 1 || month > 12) {
      ctx.addIssue({
        code: "custom",
        message: "Month must be between 01 and 12",
      });
      return NEVER;
    }

    return { month, year } satisfies Month;
  });
}

export function monthDate() {
  return month().transform((month) => monthToDate(month));
}
