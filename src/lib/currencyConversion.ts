/**
 * Convert dollars to pennies
 */
export function dollarsToPennies(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert pennies to dollars
 */
export function penniesToDollars(pennies: number): number {
  return pennies / 100;
}
