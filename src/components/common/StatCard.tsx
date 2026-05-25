import type { ReactNode } from 'react';
import './StatCard.css';

export type StatTone = 'neutral' | 'positive' | 'negative' | 'primary' | 'warning';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: StatTone;
  hint?: string;
}

export function StatCard({ label, value, icon, tone = 'neutral', hint }: StatCardProps) {
  return (
    <div className="stat-card" data-tone={tone}>
      <div className="stat-card-row">
        <span className="stat-card-label">{label}</span>
        {icon && <span className="stat-card-icon">{icon}</span>}
      </div>
      <div className="stat-card-value">{value}</div>
      {hint && <div className="stat-card-hint">{hint}</div>}
    </div>
  );
}
