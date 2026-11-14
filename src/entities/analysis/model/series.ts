import type { AnalyzeResult, Meta, MonthlyRow } from '@/shared/api'
import { SENSOR_START } from '@/shared/config'
import { periodLabel, toPeriod } from '@/shared/lib/format'
import { recordValue, type RecordKind } from './record'

/** One calendar cell. `value` is null when the record has no complete month there; `reason` says why. */
export type Cell = {
  period: string
  year: number
  month: number
  row: MonthlyRow | null
  value: number | null
  reason: string | null
  /** The incomplete month of `current_month`. */
  current: boolean
}

/** First month each record covers: harmonized from the archive start, raw sensors from their own launch. */
export function recordStart(kind: RecordKind, meta: Meta): string {
  const archive = meta.date_min.slice(0, 7)
  if (kind === 'viirs') return SENSOR_START.viirs > archive ? SENSOR_START.viirs : archive
  if (kind === 'modis') return SENSOR_START.modis > archive ? SENSOR_START.modis : archive
  return archive
}

/** Why a month has no value in this record, or null when it has one. */
export function maskReason(period: string, kind: RecordKind, meta: Meta, currentPeriod: string, daysObserved: number): string | null {
  const start = recordStart(kind, meta)
  if (period < start) {
    if (kind === 'viirs') return `VIIRS S-NPP starts in ${periodLabel(start)}`
    if (kind === 'modis') return `MODIS starts in ${periodLabel(start)}`
    return `The archive starts in ${periodLabel(start)}`
  }
  if (period === currentPeriod) return `Incomplete month: ${daysObserved} days observed so far`
  if (period > currentPeriod) return 'Not observed yet'
  return null
}

/** Rows of `monthly` inside whole years `from`..`to`. `monthly` is the full history; the period only trims it. */
export const cropMonthly = (rows: MonthlyRow[], from: number, to: number) =>
  rows.filter((r) => +r.period.slice(0, 4) >= from && +r.period.slice(0, 4) <= to)

/** Every month of the years `from`..`to`, with the record's value or the reason it has none. */
export function buildCells(res: AnalyzeResult, meta: Meta, kind: RecordKind, from: number, to: number): Cell[] {
  const byPeriod = new Map(res.monthly.map((r) => [r.period, r]))
  const cur = res.current_month
  const out: Cell[] = []
  for (let year = from; year <= to; year++) {
    for (let month = 1; month <= 12; month++) {
      const period = toPeriod(year, month)
      const row = byPeriod.get(period) ?? null
      const reason = maskReason(period, kind, meta, cur.period, cur.days_observed) ?? (row ? null : 'No data')
      out.push({ period, year, month, row, value: reason || !row ? null : recordValue(row, kind), reason, current: period === cur.period })
    }
  }
  return out
}

/** Years `from`..`to` span at most `max` years: then /analyze also returns `daily`. */
export const spansAtMost = (from: number, to: number, max: number) => to - from + 1 <= max
