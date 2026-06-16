import { parseISO } from "date-fns";
import { string } from "zod";

export function monthString() {
  return string().regex(/^\d{4}-\d{2}$/);
}

export function monthDate() {
  return monthString().transform((monthString) => parseISO(monthString));
}
