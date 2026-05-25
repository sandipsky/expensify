import { useMemo } from 'react';
import { Text } from '@mantine/core';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { ICategory } from '../../categories/types';
import type { ITransaction } from '../../transactions/types';
import { formatCurrency } from '../../../utils/format';

interface SpendingByCategoryChartProps {
  transactions: ITransaction[];
  categories: ICategory[];
}

const PALETTE = ['#4f46e5', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];

export function SpendingByCategoryChart({
  transactions,
  categories,
}: SpendingByCategoryChartProps) {
  const { labels, series } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== 'expense' || !t.categoryId) continue;
      totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
    const entries = Array.from(totals.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    return {
      labels: entries.map(([id]) =>
        categories.find((c) => c.id === id)?.name ?? 'Other',
      ),
      series: entries.map(([, v]) => Math.round(v * 100) / 100),
    };
  }, [transactions, categories]);

  if (series.length === 0) {
    return (
      <Text c="dimmed" size="sm" py="xl" ta="center">
        No spending in this period.
      </Text>
    );
  }

  const options: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false } },
    labels,
    colors: PALETTE,
    legend: { position: 'bottom', fontSize: '12px' },
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce(
                  (a: number, b: number) => a + b,
                  0,
                );
                return formatCurrency(total);
              },
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: (val: number) => formatCurrency(val) },
    },
  };

  return <Chart options={options} series={series} type="donut" height={260} />;
}
