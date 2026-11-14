import type { AnalyzeResult, Anomaly, Meta, ModelMeta, MonthlyRow } from '@/shared/api'
import { parsePeriod } from '@/shared/lib/format'
import { median } from '@/shared/lib/stats'

/** Which record the views read: the harmonized series or one raw sensor. */
export type Sensor = 'harm' | 'modis' | 'viirs'

export const SENSORS = [
  { id: 'harm', label: 'Harmonized' },
  { id: 'modis', label: 'MODIS' },
  { id: 'viirs', label: 'VIIRS' },
] as const satisfies readonly { id: Sensor; label: string }[]

export const isSensor = (v: string | null): v is Sensor => SENSORS.some((s) => s.id === v)

/** VIIRS S-NPP is the reference series and starts in 2012 (architecture: S-NPP only). */
export const VIIRS_START_YEAR = 2012

export const scaleName = (s: ModelMeta['reference_scale']) => (s === 'MODIS' ? 'MODIS-equivalent' : 'VIIRS-equivalent')

export const unitOf = (s: Sensor, meta: Meta) =>
  s === 'harm' ? `${scaleName(meta.model.reference_scale)} detections` : `${s.toUpperCase()} detections`

export const sensorValue = (r: MonthlyRow, s: Sensor) => (s === 'harm' ? r.count_h : s === 'modis' ? r.modis_raw : r.viirs_raw)

/** One month of one record. `value` is null where the sensor has no complete month of data. */
export type Cell = { year: number; month: number; value: number | null; median: number; pct?: number; anomaly?: Anomaly }
export type Series = { cells: Cell[]; current: Cell & { daysObserved: number } }

/**
 * Complete months for the calendar, plus the incomplete current month on its own.
 * The harmonized record takes the backend's norm and anomaly class; a raw sensor has none in the API,
 * so its norm is the median of the same calendar month over the baseline years, computed here from the area's totals.
 */
export function buildSeries(res: AnalyzeResult, meta: Meta, s: Sensor): Series {
  const first = meta.date_min.slice(0, 7)
  const cur = res.current_month.period
  const [b0, b1] = meta.baseline_years
  const has = (p: string) => p >= first && p < cur && (s !== 'viirs' || +p.slice(0, 4) >= VIIRS_START_YEAR)

  const norms =
    s === 'harm'
      ? null
      : Array.from({ length: 12 }, (_, i) =>
          median(
            res.monthly
              .filter((r) => +r.period.slice(5, 7) === i + 1 && +r.period.slice(0, 4) >= b0 && +r.period.slice(0, 4) <= b1 && has(r.period))
              .map((r) => sensorValue(r, s)),
          ),
        )

  const toCell = (r: MonthlyRow, available: boolean): Cell => {
    const { year, month } = parsePeriod(r.period)
    const value = available ? sensorValue(r, s) : null
    return norms ? { year, month, value, median: norms[month - 1] } : { year, month, value, median: r.median, pct: r.pct, anomaly: r.anomaly }
  }

  const cells = res.monthly.filter((r) => r.period < cur).map((r) => toCell(r, has(r.period)))
  const cm = res.current_month
  const row = res.monthly.find((r) => r.period === cur)
  const { year, month } = parsePeriod(cur)
  const curOk = s !== 'viirs' || year >= VIIRS_START_YEAR
  const current: Series['current'] =
    s === 'harm'
      ? { year, month, value: cm.count_h, median: cm.median, pct: cm.pct, anomaly: cm.anomaly, daysObserved: cm.days_observed }
      : { ...(row ? toCell(row, curOk) : { year, month, value: null, median: 0 }), daysObserved: cm.days_observed }
  return { cells, current }
}
