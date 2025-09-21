import { penniesToDollars } from "./currencyConversion";

export function formatCurrency(pennies: number): string {
  const dollars = penniesToDollars(pennies);
  return (Object.is(dollars, -0) ? 0 : dollars).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
