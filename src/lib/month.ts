export type Month = {
  month: number;
  year: number;
};

/**
 * Convert a Month object to a Date object (first day of the month)
 */
export function monthToDate(month: Month): Date {
  return new Date(month.year, month.month - 1);
}

/**
 * Convert a Date object to a Month object
 */
export function dateToMonth(date: Date): Month {
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

/**
 * Convert a Month object or Date to a string in "MM-yyyy" format
 */
export function monthToString(rawMonth: Month | Date): string {
  const { month, year } = rawMonth instanceof Date ? dateToMonth(rawMonth) : rawMonth;
  const monthPart = month.toString().padStart(2, "0");
  return `${monthPart}-${year}`;
}
