const numberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const CURRENCY_SYMBOL = 'Rs';

export function formatCurrency(value: number): string {
  return `${CURRENCY_SYMBOL} ${numberFormatter.format(value)}`;
}

export function formatSignedCurrency(value: number): string {
  if (value === 0) return formatCurrency(0);
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

const compactFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}
