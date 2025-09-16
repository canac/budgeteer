/**
 * Convert a month Date object to a string in "MM-yyyy" format
 */
export function monthToString(month: Date): string {
  const monthPart = (month.getMonth() + 1).toString().padStart(2, "0");
  return `${monthPart}-${month.getFullYear().toString()}`;
}
