import type { Cell } from '@/entities/sensor'

export type Summary = {
  total: number
  /** Calendar month (1–12) with the most detections summed over the period. */
  peakMonth: number | null
  topYear: number | null
  best: { year: number; month: number; value: number } | null
}

export function summarize(cells: Cell[]): Summary {
  let total = 0
  let best: Summary['best'] = null
  const perMonth = Array(12).fill(0)
  const perYear = new Map<number, number>()
  for (const c of cells) {
    if (c.value === null) continue
    total += c.value
    perMonth[c.month - 1] += c.value
    perYear.set(c.year, (perYear.get(c.year) ?? 0) + c.value)
    if (!best || c.value > best.value) best = { year: c.year, month: c.month, value: c.value }
  }
  return {
    total,
    peakMonth: total ? perMonth.indexOf(Math.max(...perMonth)) + 1 : null,
    topYear: total ? [...perYear].sort((a, b) => b[1] - a[1])[0][0] : null,
    best,
  }
}
