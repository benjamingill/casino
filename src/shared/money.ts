/** Rounds to whole cents, so floating-point error never builds up. */
export const roundCents = (amount: number) => Math.round(amount * 100) / 100;

/** "$12" or "$3.60". */
export function formatMoney(amount: number): string {
  const a = Math.abs(roundCents(amount));
  return `$${Number.isInteger(a) ? a : a.toFixed(2)}`;
}

/** "+$3.60", "−$5", or `zero` for no change. */
export function formatSigned(amount: number, zero = ''): string {
  const a = roundCents(amount);
  if (a > 0) return `+${formatMoney(a)}`;
  if (a < 0) return `−${formatMoney(a)}`;
  return zero;
}
