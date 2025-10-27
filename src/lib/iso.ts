/**
 * Pad a number with leading zeros
 */
function pad(num: number, length: number): string {
  return num.toString().padStart(length, "0");
}

/**
 * Convert a Date to a month string in "YYYY-MM" format
 */
export function toISOMonthString(date: Date): string {
  return toISODateString(date).slice(0, 7);
}

/**
 * Convert a Date to a date string in "YYYY-MM-DD" format
 */
export function toISODateString(date: Date): string {
  const year = pad(date.getFullYear(), 4);
  const month = pad(date.getMonth() + 1, 2);
  const day = pad(date.getDate(), 2);
  return `${year}-${month}-${day}`;
}
