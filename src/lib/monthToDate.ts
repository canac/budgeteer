import { parse } from "date-fns";

/**
 * Convert a month string in "MM-yyyy" format to a Date object
 */
export function monthToDate(month: string): Date {
  return parse(month, "MM-yyyy", new Date());
}
