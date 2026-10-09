import './progress.scss'

export interface ProgressProps {
  /** 0–100; anything above 100 fills the bar. */
  value: number
  variant?: 'accent' | 'warn' | 'error'
  /** What the bar measures, for screen readers. */
  label: string
}

/** A thin horizontal bar, used for how much of a credit limit is in use. */
export function Progress({ value, variant = 'accent', label }: ProgressProps) {
  const percent = Math.max(0, Math.min(value, 100))
  return (
    <div
      className={`progress progress--${variant}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
    >
      <div className="progress__bar" style={{ width: `${percent}%` }} />
    </div>
  )
}
