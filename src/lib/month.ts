/**
 * Convert a Date to a month string in "YYYY-MM" format
 */
export function toISOMonthString(date: Date): string {
  return date.toISOString().slice(0, 7);
}
