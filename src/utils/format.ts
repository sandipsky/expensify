import { getCurrency } from '../constants/currencies';
import { getCurrencyCode } from '../stores/preferencesStore';

const numberFormatterCache = new Map<string, Intl.NumberFormat>();
const compactFormatterCache = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: string): Intl.NumberFormat {
  let formatter = numberFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    numberFormatterCache.set(locale, formatter);
  }
  return formatter;
}

function getCompactFormatter(locale: string): Intl.NumberFormat {
  let formatter = compactFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    compactFormatterCache.set(locale, formatter);
  }
  return formatter;
}

export function getCurrencySymbol(): string {
  return getCurrency(getCurrencyCode()).symbol;
}

export function formatCurrency(value: number): string {
  const currency = getCurrency(getCurrencyCode());
  return `${currency.symbol} ${getNumberFormatter(currency.locale).format(value)}`;
}

export function formatSignedCurrency(value: number): string {
  if (value === 0) return formatCurrency(0);
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export function formatCompactNumber(value: number): string {
  const currency = getCurrency(getCurrencyCode());
  return getCompactFormatter(currency.locale).format(value);
}
