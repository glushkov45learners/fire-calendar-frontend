import { periodLabel, shiftPeriod } from '@/shared/lib/format'

type Props = {
  value: string
  /** First and last month that can be chosen. */
  min: string
  max: string
  current: string
  /** null returns to the current month. */
  onChange: (period: string | null) => void
}

/** Step the chosen month back and forth, or return to the current one. Clicking a calendar cell chooses one directly. */
export function MonthStepper({ value, min, max, current, onChange }: Props) {
  const prev = shiftPeriod(value, -1)
  const next = shiftPeriod(value, 1)
  return (
    <div className="stepper" role="group" aria-label="Chosen month">
      <button type="button" className="action" disabled={prev < min} onClick={() => onChange(prev)} aria-label={`Previous month, ${periodLabel(prev)}`}>
        ‹
      </button>
      <button type="button" className="action" disabled={next > max} onClick={() => onChange(next)} aria-label={`Next month, ${periodLabel(next)}`}>
        ›
      </button>
      <button type="button" className="action" disabled={value === current || current < min || current > max} onClick={() => onChange(null)}>
        Current month
      </button>
    </div>
  )
}
