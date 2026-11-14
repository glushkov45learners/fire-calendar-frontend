type Props = { from: number; to: number; min: number; max: number; onChange: (from: number, to: number) => void }

/** Whole years between the archive's first and last (from /meta). */
export function PeriodSelect({ from, to, min, max, onChange }: Props) {
  const years = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const options = years.map((y) => (
    <option key={y} value={y}>
      {y}
    </option>
  ))
  // Moving one end past the other drags the other end along, so the range never inverts.
  return (
    <div className="period">
      <select aria-label="From year" value={from} onChange={(e) => onChange(+e.target.value, Math.max(to, +e.target.value))}>
        {options}
      </select>
      <span>to</span>
      <select aria-label="To year" value={to} onChange={(e) => onChange(Math.min(from, +e.target.value), +e.target.value)}>
        {options}
      </select>
    </div>
  )
}
