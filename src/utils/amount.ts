/** The currency new accounts start in until settings exist. */
export const DEFAULT_CURRENCY = 'NPR'

/** The browser's language, which amounts are formatted for. */
const locale = () => navigator.language || 'en-US'

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale()}|${JSON.stringify(options)}`
  let result = formatters.get(key)
  if (!result) {
    result = new Intl.NumberFormat(locale(), options)
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
 * "Rs 1,234.50" rather than "NPR 1,234.50". `signDisplay: 'exceptZero'`
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
