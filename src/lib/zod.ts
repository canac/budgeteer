import { parseISO } from "date-fns";
import { enum as zodEnum, string } from "zod";

export function monthString() {
  return string().regex(/^\d{4}-\d{2}$/);
}

export function monthDate() {
  return monthString().transform((monthString) => parseISO(monthString));
}

export function categoryType() {
  return zodEnum(["SAVINGS", "ACCUMULATING", "NON_ACCUMULATING"]);
}
