import { Group, Select, Stack, Text } from '@mantine/core';
import { IconCoin, IconMoon, IconSun } from '@tabler/icons-react';
import { useMantineColorScheme } from '@mantine/core';
import { PageHeader } from '../../../components/common';
import { CURRENCIES } from '../../../constants/currencies';
import { formatCurrency } from '../../../utils/format';
import {
  selectCurrencyCode,
  usePreferencesStore,
} from '../../../stores/preferencesStore';
import './SettingsPage.css';

export function SettingsPage() {
  const currencyCode = usePreferencesStore(selectCurrencyCode);
  const setCurrencyCode = usePreferencesStore((state) => state.setCurrencyCode);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const currencyOptions = CURRENCIES.map((currency) => ({
    value: currency.code,
    label: `${currency.code} — ${currency.label} (${currency.symbol})`,
  }));

  return (
    <div className="page">
      <PageHeader
        title="Settings"
        subtitle="Personalize how Expensify looks and formats your money."
      />

      <div className="settings-grid">
        <section className="surface-card surface-card-padded settings-section">
          <div className="settings-section-head">
            <div className="settings-section-icon">
              <IconCoin size={18} />
            </div>
            <div>
              <h3 className="settings-section-title">Currency</h3>
              <p className="settings-section-subtitle">
                Used to format every amount across the app.
              </p>
            </div>
          </div>

          <Stack gap="sm">
            <Select
              label="Display currency"
              data={currencyOptions}
              value={currencyCode}
              onChange={(value) => value && setCurrencyCode(value)}
              allowDeselect={false}
              searchable
            />
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                Preview:
              </Text>
              <Text size="sm" fw={600}>
                {formatCurrency(1234.5)}
              </Text>
            </Group>
          </Stack>
        </section>

        <section className="surface-card surface-card-padded settings-section">
          <div className="settings-section-head">
            <div className="settings-section-icon" data-tone="primary">
              {colorScheme === 'dark' ? <IconMoon size={18} /> : <IconSun size={18} />}
            </div>
            <div>
              <h3 className="settings-section-title">Appearance</h3>
              <p className="settings-section-subtitle">
                Switch between light and dark themes.
              </p>
            </div>
          </div>

          <Select
            label="Theme"
            data={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'System' },
            ]}
            value={colorScheme}
            onChange={(value) =>
              value && setColorScheme(value as 'light' | 'dark' | 'auto')
            }
            allowDeselect={false}
          />
        </section>
      </div>
    </div>
  );
}
