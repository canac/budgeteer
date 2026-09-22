import {
  differenceInCalendarDays,
  differenceInMonths,
  differenceInWeeks,
  differenceInYears,
} from "date-fns";
import { penniesToDollars } from "./currencyConversion";

export const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

export const monthOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function formatRelativeDate(date: Date, now = new Date()): string {
  const days = differenceInCalendarDays(date, now);
  if (Math.abs(days) < 7) {
    return relativeFormatter.format(days, "day");
  }

  const weeks = differenceInWeeks(date, now);
  if (Math.abs(weeks) < 5) {
    return relativeFormatter.format(weeks, "week");
  }

  const months = differenceInMonths(date, now);
  if (Math.abs(months) < 12) {
    return relativeFormatter.format(months, "month");
  }

  return relativeFormatter.format(differenceInYears(date, now), "year");
}

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(pennies: number): string {
  const dollars = penniesToDollars(pennies);
  return currencyFormatter.format(Object.is(dollars, -0) ? 0 : dollars);
}

/** Format an amount where spending is the norm. */
export function formatSignedCurrency(pennies: number): string {
  const sign = pennies > 0 ? "+" : "";
  return sign + formatCurrency(Math.abs(pennies));
}

export const percentageFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  currency: "USD",
});

/** Get the `positive` or `negative` className for an amount */
export const amountSignClassname = (amount: number): string =>
  amount >= 0 ? "positive" : "negative";
