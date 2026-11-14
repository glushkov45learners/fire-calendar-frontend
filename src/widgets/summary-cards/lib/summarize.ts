import type { CalendarCell } from '@/shared/api'
import { slope } from '@/shared/lib/stats'

export type Summary = {
  total: number
  peakMonth: number | null
  topYear: { year: number; count: number } | null
  /** Linear trend of annual totals as % of the mean annual total per year; null under 3 complete years. */
  trendPct: number | null
  trendYears: number
}

export function summarize(cells: CalendarCell[]): Summary {
  const byYear = new Map<number, { count: number; months: number }>()
  const byMonth = Array<number>(12).fill(0)
  for (const c of cells) {
    const y = byYear.get(c.year) ?? { count: 0, months: 0 }
    byYear.set(c.year, { count: y.count + c.count, months: y.months + 1 })
    byMonth[c.month - 1] += c.count
  }
  const total = cells.reduce((a, c) => a + c.count, 0)
  const years = [...byYear].map(([year, v]) => ({ year, ...v }))
  const top = years.reduce<(typeof years)[number] | null>((a, y) => (!a || y.count > a.count ? y : a), null)
  // Partial years (sensor start, the current year) would bend the trend; use complete ones only.
  const complete = years.filter((y) => y.months === 12)
  const mean = complete.reduce((a, y) => a + y.count, 0) / (complete.length || 1)
  const trendPct = complete.length >= 3 && mean > 0 ? (slope(complete.map((y) => [y.year, y.count])) / mean) * 100 : null

  return {
    total,
    peakMonth: total ? byMonth.indexOf(Math.max(...byMonth)) + 1 : null,
    topYear: top && top.count ? { year: top.year, count: top.count } : null,
    trendPct,
    trendYears: complete.length,
  }
}
