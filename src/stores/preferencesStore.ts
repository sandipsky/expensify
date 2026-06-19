import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { config } from '../config/env';
import { DEFAULT_CURRENCY_CODE } from '../constants/currencies';

interface PreferencesState {
  currencyCode: string;
}

interface PreferencesActions {
  setCurrencyCode: (code: string) => void;
}

type PreferencesStore = PreferencesState & PreferencesActions;

const PREFERENCES_STORAGE_KEY = 'expensify-preferences';

export const usePreferencesStore = create<PreferencesStore>()(
  devtools(
    persist(
      (set) => ({
        currencyCode: DEFAULT_CURRENCY_CODE,
        setCurrencyCode: (code: string): void => {
          set({ currencyCode: code }, false, 'preferences/setCurrencyCode');
        },
      }),
      {
        name: PREFERENCES_STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        partialize: ({ currencyCode }): PreferencesState => ({ currencyCode }),
      },
    ),
    { name: 'PreferencesStore', enabled: config.app.isDev },
  ),
);

export const selectCurrencyCode = (state: PreferencesStore): string =>
  state.currencyCode;

// Non-reactive accessor for use in plain formatter helpers (utils/format.ts).
export function getCurrencyCode(): string {
  return usePreferencesStore.getState().currencyCode;
}
