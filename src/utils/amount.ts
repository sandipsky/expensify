/** The currency new accounts start in. */
export const DEFAULT_CURRENCY = 'NPR'

/**
 * Amounts are always written the Nepali way, whatever the browser's language:
 * lakh and crore grouping with Latin digits, "Rs 12,34,567.50". `en-IN` is
 * the locale that writes it so; `ne-NP` would use Devanagari digits.
 */
const MONEY_LOCALE = 'en-IN'

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options)
  let result = formatters.get(key)
  if (!result) {
    result = new Intl.NumberFormat(MONEY_LOCALE, options)
    formatters.set(key, result)
  }
  return result
}

/** ISO 4217 decimal places, read from Intl: JPY 0, USD 2, KWD 3. */
export function fractionDigits(currency: string): number {
  return formatter({ style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
}

/** The currency's short symbol in the locale ("$", "€", "Rs"), for an input prefix. */
export function currencySymbol(currency: string): string {
  const parts = formatter({
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value ?? currency
}

/**
 * Formats an amount as currency with the short symbol, so rupees read
 * "Rs 1,23,456.50" rather than "NPR 1,23,456.50". `signDisplay: 'exceptZero'`
 * gives the +/− that income and expense need alongside color.
 */
export function formatMoney(
  amount: number,
  currency: string,
  signDisplay: 'auto' | 'always' | 'exceptZero' | 'never' = 'auto',
): string {
  const digits = fractionDigits(currency)
  return formatter({
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    signDisplay,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)
}
