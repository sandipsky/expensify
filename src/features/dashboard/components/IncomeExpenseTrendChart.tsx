import { useMemo } from 'react';
import { Text } from '@mantine/core';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import dayjs from 'dayjs';
import type { ITransaction } from '../../transactions/types';
import { formatCurrency, formatCompactNumber } from '../../../utils/format';

interface IncomeExpenseTrendChartProps {
  transactions: ITransaction[];
}

export function IncomeExpenseTrendChart({ transactions }: IncomeExpenseTrendChartProps) {
  const { months, incomeSeries, expenseSeries } = useMemo(() => {
    const now = dayjs();
    const buckets: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month');
      buckets.push({ key: m.format('YYYY-MM'), label: m.format('MMM') });
    }
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    for (const t of transactions) {
      const key = dayjs(t.date).format('YYYY-MM');
      if (t.kind === 'income') {
        incomeMap.set(key, (incomeMap.get(key) ?? 0) + t.amount);
      } else if (t.kind === 'expense') {
        expenseMap.set(key, (expenseMap.get(key) ?? 0) + t.amount);
      }
    }
    return {
      months: buckets.map((b) => b.label),
      incomeSeries: buckets.map((b) => Math.round((incomeMap.get(b.key) ?? 0) * 100) / 100),
      expenseSeries: buckets.map((b) => Math.round((expenseMap.get(b.key) ?? 0) * 100) / 100),
    };
  }, [transactions]);

  const hasData = incomeSeries.some((v) => v > 0) || expenseSeries.some((v) => v > 0);
  if (!hasData) {
    return (
      <Text c="dimmed" size="sm" py="xl" ta="center">
        Not enough data yet.
      </Text>
    );
  }

  const options: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#10b981', '#ef4444'],
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: months,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#64748b', fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        style: { colors: '#64748b', fontSize: '12px' },
        formatter: (val: number) => formatCompactNumber(val),
      },
    },
    grid: { borderColor: '#e7e9f0', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'right' },
    tooltip: { y: { formatter: (val: number) => formatCurrency(val) } },
  };

  return (
    <Chart
      options={options}
      series={[
        { name: 'Income', data: incomeSeries },
        { name: 'Expense', data: expenseSeries },
      ]}
      type="area"
      height={260}
    />
  );
}
