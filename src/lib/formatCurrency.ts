export function formatCurrency(amount: number): string {
  return (Object.is(amount, -0) ? 0 : amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
