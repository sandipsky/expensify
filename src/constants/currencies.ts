export interface ICurrency {
  code: string;
  symbol: string;
  label: string;
  locale: string;
}

// Supported display currencies. The app stores a single currency code in user
// preferences (PROJECT.md section 8 — single currency, configurable). All use
// 2 fractional digits to match the amount data model.
export const CURRENCIES: ICurrency[] = [
  { code: 'NPR', symbol: 'Rs', label: 'Nepalese Rupee', locale: 'en-IN' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', symbol: '$', label: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', label: 'Euro', locale: 'en-IE' },
  { code: 'GBP', symbol: '£', label: 'British Pound', locale: 'en-GB' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', locale: 'en-CA' },
] as const;

export const DEFAULT_CURRENCY_CODE = 'NPR';

export function getCurrency(code: string): ICurrency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
