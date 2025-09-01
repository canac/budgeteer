/**
 * Round a currency value to the nearest cent.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
