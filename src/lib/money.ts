/**
 * Format an integer number of AUD cents as a display string.
 *
 * Whole-dollar amounts render without decimals (`A$39`); amounts with a cents
 * remainder render with exactly two decimals (`A$39.50`). Cents-based integer
 * math avoids float artefacts like `A$39.5` for 3950 cents.
 */
export function formatAud(cents: number): string {
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs / 100);
  const remainder = abs % 100;
  return remainder === 0
    ? `${sign}A$${whole}`
    : `${sign}A$${whole}.${String(remainder).padStart(2, '0')}`;
}
