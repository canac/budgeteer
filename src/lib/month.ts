/**
 * Convert a Date to a month string in "YYYY-MM" format
 */
export function serializeISO(date: Date): string {
  return date.toISOString().slice(0, 7);
}
