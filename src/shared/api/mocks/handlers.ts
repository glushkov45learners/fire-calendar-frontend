// Mock of the contract-3 backend, served by the dev server when VITE_USE_MOCKS=true (see vite.config.ts).
// Built on real monthly MODIS / VIIRS S-NPP counts for four areas, taken from docs/design2-mockup.html.
import grid from '../../../../public/data/grid.json'
import { COVERAGE_BBOX } from '@/shared/config'
import { areaKm2, bbox, bboxesIntersect, bboxPolygon, centroid, inBbox, pointInGeometry, type Bbox, type Geometry } from '@/shared/lib/geo'
import { median, quantile } from '@/shared/lib/stats'
import type { AnalyzeResult, Anomaly, CalendarCsvQuery, DailyRow, Meta, MonthlyRow } from '../types'
import data from './data.json'

export class MockError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export const DATE_MIN = '2000-11-01'
// The mock archive ends on 14 November 2026: that month is the incomplete "current" one, 14 days observed.
export const DATE_MAX = '2026-11-14'
const BASELINE: [number, number] = [2001, 2025]
const CSV_ROW_LIMIT = 500_000
const UKRAINE_KM2 = 603_550

export function mockMeta(): Meta {
  return {
    coverage_bbox: COVERAGE_BBOX,
    date_min: DATE_MIN,
    date_max: DATE_MAX,
    grid_step: 0.1,
    baseline_years: BASELINE,
    model: {
      model_version: 'v0-mock',
      reference_scale: 'VIIRS_SNPP',
      fit_years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
      holdout_years: [2022, 2023, 2024, 2025],
      metrics: { mape: 0.21, r2: 0.87, bias: -0.03 },
      notes: 'v0: one constant MODIS→VIIRS S-NPP ratio per area, fitted on the 2012–2025 overlap. 2000–2002 are Terra only.',
    },
  }
}

/* ───────── validation (the errors of contract 3) ───────── */

const ISO = /^\d{4}-\d{2}-\d{2}$/

function validate(q: { aoi?: unknown; from?: unknown; to?: unknown }): { aoi: Geometry; from: string; to: string } {
  const g = q.aoi as Geometry | undefined
  const ringsOk = (rings: unknown) => Array.isArray(rings) && rings.length > 0 && rings.every((r) => Array.isArray(r) && r.length >= 4)
  const ok =
    (g?.type === 'Polygon' && ringsOk(g.coordinates)) ||
    (g?.type === 'MultiPolygon' && Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(ringsOk))
  if (!ok) throw new MockError(400, 'invalid_aoi', 'AOI must be a Polygon or MultiPolygon')
  const from = String(q.from ?? '')
  const to = String(q.to ?? '')
  if (!ISO.test(from) || !ISO.test(to) || from > to || from < DATE_MIN || to > DATE_MAX)
    throw new MockError(400, 'invalid_range', `from and to must satisfy ${DATE_MIN} <= from <= to <= ${DATE_MAX}`)
  if (!bboxesIntersect(bbox(g), COVERAGE_BBOX)) throw new MockError(400, 'outside_coverage', 'AOI does not intersect the coverage')
  return { aoi: g, from, to }
}

/* ───────── series ───────── */

type AreaKey = keyof typeof data.cal.modis
const AREAS = data.areas as unknown as Record<AreaKey, Bbox | null>

// shortcut: a custom area reuses the smallest preset whose box holds its centre, scaled by area; the backend sums real cells.
function pick(aoi: Geometry): { key: AreaKey; scale: number } {
  const [lon, lat] = centroid(aoi)
  const boxes = (Object.keys(AREAS) as AreaKey[]).filter((k) => AREAS[k] && inBbox(lon, lat, AREAS[k]!))
  const key = boxes.sort((a, b) => areaKm2(bboxPolygon(AREAS[a]!)) - areaKm2(bboxPolygon(AREAS[b]!)))[0] ?? 'ua'
  const ref = AREAS[key] ? areaKm2(bboxPolygon(AREAS[key]!)) : UKRAINE_KM2
  return { key, scale: Math.min(1, areaKm2(aoi) / ref) }
}

const period = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
const yearOf = (p: string) => +p.slice(0, 4)
const inBaseline = (p: string) => yearOf(p) >= BASELINE[0] && yearOf(p) <= BASELINE[1]

// shortcut: temporary thresholds on the percentile; the real formula comes from Artem and is implemented in SQL by Andriy.
function classify(pct: number): Anomaly {
  if (pct >= 95) return 'extreme'
  if (pct >= 75) return 'high'
  if (pct <= 10) return 'low'
  return 'normal'
}

/** VIIRS S-NPP detections per MODIS detection over 2012–2025, as ratio() in the mockup: the whole "model" of v0. */
function overlapRatio(key: AreaKey): number {
  let v = 0
  let m = 0
  for (let y = 2012; y <= 2025; y++) {
    for (let i = 0; i < 12; i++) {
      v += data.cal.viirs[key][y - data.y0][i]
      m += data.cal.modis[key][y - data.y0][i]
    }
  }
  return m ? v / m : 1
}

export function mockMonthly(aoi: Geometry): MonthlyRow[] {
  const { key, scale } = pick(aoi)
  const ratio = overlapRatio(key)
  const raw: Omit<MonthlyRow, 'median' | 'z' | 'pct' | 'anomaly'>[] = []
  for (let i = 0; i < data.cal.modis[key].length; i++) {
    const y = data.y0 + i
    for (let m = 1; m <= 12; m++) {
      const p = period(y, m)
      if (p < DATE_MIN.slice(0, 7) || p > DATE_MAX.slice(0, 7)) continue
      const modis = Math.round(data.cal.modis[key][i][m - 1] * scale)
      const viirs = y >= 2012 ? Math.round(data.cal.viirs[key][i][m - 1] * scale) : 0
      const count = y >= 2012 ? viirs : modis * ratio
      raw.push({ period: p, count_h: +count.toFixed(1), frp_h: +(count * 11.6).toFixed(1), modis_raw: modis, viirs_raw: viirs })
    }
  }
  return raw.map((r) => {
    const base = raw.filter((o) => o.period.slice(5) === r.period.slice(5) && inBaseline(o.period)).map((o) => o.count_h)
    const mean = base.reduce((a, b) => a + b, 0) / base.length
    const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length)
    const below = base.filter((b) => b < r.count_h).length + base.filter((b) => b === r.count_h).length / 2
    const pct = Math.round((100 * below) / base.length)
    return { ...r, median: median(base), z: sd ? +((r.count_h - mean) / sd).toFixed(2) : 0, pct, anomaly: classify(pct) }
  })
}

/* ───────── deterministic randomness ───────── */

function rng(seed: string) {
  let a = 2166136261
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 16777619)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
/** Days of the month that are in the archive: the current month stops at DATE_MAX. */
const observedDays = (p: string) => (p === DATE_MAX.slice(0, 7) ? +DATE_MAX.slice(8) : daysIn(yearOf(p), +p.slice(5)))

type DayRow = DailyRow & { modis_raw: number; viirs_raw: number }

/** Spreads each month over its days with bursty weights, so a few days carry most fires, as in reality. */
function mockDays(rows: MonthlyRow[], from: string, to: string, seed: string): DayRow[] {
  const out: DayRow[] = []
  for (const r of rows) {
    if (r.period < from.slice(0, 7) || r.period > to.slice(0, 7)) continue
    const n = observedDays(r.period)
    const rand = rng(`${seed}:${r.period}`)
    const w = Array.from({ length: n }, () => rand() ** 4)
    const sum = w.reduce((a, b) => a + b, 0) || 1
    w.forEach((wi, i) => {
      const date = `${r.period}-${String(i + 1).padStart(2, '0')}`
      if (date < from || date > to) return
      const f = wi / sum
      out.push({
        date,
        count_h: +(r.count_h * f).toFixed(1),
        frp_h: +(r.frp_h * f).toFixed(1),
        modis_raw: Math.round(r.modis_raw * f),
        viirs_raw: Math.round(r.viirs_raw * f),
      })
    })
  }
  return out
}

const longerThan3Years = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000 > 3 * 366

/* ───────── endpoints ───────── */

export function mockAnalyze(body: unknown): AnalyzeResult {
  const { aoi, from, to } = validate(body as object)
  const rows = mockMonthly(aoi)
  const inRange = rows.filter((r) => r.period >= from.slice(0, 7) && r.period <= to.slice(0, 7))
  const cur = rows.at(-1)!
  const years = new Map<number, number>()
  for (const r of rows.filter((o) => inBaseline(o.period))) years.set(yearOf(r.period), (years.get(yearOf(r.period)) ?? 0) + r.count_h)
  const area = areaKm2(aoi)
  const seed = JSON.stringify(bbox(aoi))
  // Shuffled on purpose: the contract promises no order, and the client must sort.
  const monthly = [...rows].sort(() => (Math.random() < 0.5 ? -1 : 1))
  return {
    area_km2: +area.toFixed(1),
    cells: Math.max(1, Math.round(area / 80)), // a 0.1° cell over Ukraine is about 80 km²
    monthly,
    daily: longerThan3Years(from, to) ? [] : mockDays(rows, from, to, seed).map(({ date, count_h, frp_h }) => ({ date, count_h, frp_h })),
    current_month: {
      period: cur.period,
      count_h: cur.count_h,
      median: cur.median,
      ratio: cur.median ? +(cur.count_h / cur.median).toFixed(2) : 0,
      pct: cur.pct,
      anomaly: cur.anomaly,
      days_observed: observedDays(cur.period),
    },
    top_years: [...years].map(([year, count_h]) => ({ year, count_h: +count_h.toFixed(1) })).sort((a, b) => b.count_h - a.count_h),
    seasonality: Array.from({ length: 12 }, (_, i) => {
      const base = rows.filter((r) => +r.period.slice(5) === i + 1 && inBaseline(r.period)).map((r) => r.count_h)
      return { month: i + 1, median: median(base), p25: +quantile(base, 0.25).toFixed(1), p75: +quantile(base, 0.75).toFixed(1) }
    }),
    totals: {
      count_h: +inRange.reduce((a, r) => a + r.count_h, 0).toFixed(1),
      hotspots_raw: inRange.reduce((a, r) => a + r.modis_raw + r.viirs_raw, 0),
    },
  }
}

export function mockCalendarCsv(body: unknown): string {
  const { aoi, from, to } = validate(body as object)
  const q = body as CalendarCsvQuery
  const rows = mockMonthly(aoi)
  if (q.granularity === 'day') {
    const days = mockDays(rows, from, to, JSON.stringify(bbox(aoi)))
    return csv(['period', 'count_h', 'frp_h', 'modis_raw', 'viirs_raw'], days.map((d) => [d.date, d.count_h, d.frp_h, d.modis_raw, d.viirs_raw]))
  }
  const cols = ['period', 'count_h', 'frp_h', 'modis_raw', 'viirs_raw', 'median', 'z', 'pct', 'anomaly'] as const
  return csv(cols, rows.filter((r) => r.period >= from.slice(0, 7) && r.period <= to.slice(0, 7)).map((r) => cols.map((c) => r[c])))
}

const csv = (head: readonly string[], rows: (string | number)[][]) => [head.join(','), ...rows.map((r) => r.join(','))].join('\n') + '\n'

/** Grid cells whose centre is inside the area, weighted by the archive heat (contract 3: cells by centre). */
function cellsIn(aoi: Geometry): { lon: number; lat: number; w: number }[] {
  const [W, , , N] = grid.bbox
  const out: { lon: number; lat: number; w: number }[] = []
  const box = bbox(aoi)
  for (let i = 0; i < grid.grid.length; i++) {
    const l = parseInt(grid.grid[i], 36)
    if (!l) continue
    const lon = W + (i % grid.gw) * grid.step
    const lat = N - Math.floor(i / grid.gw) * grid.step - grid.step
    const cx = lon + grid.step / 2
    const cy = lat + grid.step / 2
    if (inBbox(cx, cy, box) && pointInGeometry(cx, cy, aoi)) out.push({ lon, lat, w: (l / 35) ** 1.7 })
  }
  return out
}

/**
 * Raw FIRMS-like points, exactly inside the polygon. The count per month follows the raw MODIS and VIIRS S-NPP counts,
 * plus ~3% industrial (type 2) points that the harmonized series leaves out.
 * shortcut: no NOAA-20/21 rows, which the real export includes.
 */
export function mockHotspotsCsv(body: unknown): string {
  const { aoi, from, to } = validate(body as object)
  const months = mockMonthly(aoi).filter((r) => r.period >= from.slice(0, 7) && r.period <= to.slice(0, 7))
  const total = months.reduce((a, r) => a + Math.round((r.modis_raw + r.viirs_raw) * 1.03), 0)
  if (total > CSV_ROW_LIMIT) throw new MockError(413, 'too_many_rows', `${total} rows exceed the limit of ${CSV_ROW_LIMIT}`)

  const cells = cellsIn(aoi)
  const cum: number[] = []
  cells.reduce((a, c, i) => (cum[i] = a + c.w), 0)
  const box = bbox(aoi)
  const rand = rng(`${JSON.stringify(box)}:${from}:${to}`)

  const where = (): [number, number] => {
    for (let t = 0; t < 8; t++) {
      let lon: number
      let lat: number
      if (cells.length) {
        const x = rand() * cum[cum.length - 1]
        let lo = 0
        let hi = cum.length - 1
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (cum[mid] < x) lo = mid + 1
          else hi = mid
        }
        lon = cells[lo].lon + rand() * grid.step
        lat = cells[lo].lat + rand() * grid.step
      } else {
        lon = box[0] + rand() * (box[2] - box[0])
        lat = box[1] + rand() * (box[3] - box[1])
      }
      if (pointInGeometry(lon, lat, aoi)) return [lon, lat]
    }
    return centroid(aoi)
  }

  const lines = ['latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp,daynight,type,product']
  for (const r of months) {
    const y = yearOf(r.period)
    const nrt = y >= 2026
    const days = observedDays(r.period)
    const emit = (instrument: 'MODIS' | 'VIIRS', n: number) => {
      for (let i = 0; i < n; i++) {
        const [lon, lat] = where()
        const day = String(1 + Math.floor(rand() ** 0.7 * days)).padStart(2, '0')
        const night = rand() < 0.3
        const sat = instrument === 'VIIRS' ? 'SNPP' : r.period < '2002-07' || rand() < 0.5 ? 'Terra' : 'Aqua'
        const hhmm = night ? ['0012', '0047', '2018', '2341'][Math.floor(rand() * 4)] : ['0831', '0945', '1102', '1214'][Math.floor(rand() * 4)]
        const conf = instrument === 'MODIS' ? String(Math.floor(20 + rand() * 80)) : ['l', 'n', 'n', 'h'][Math.floor(rand() * 4)]
        const type = nrt ? '' : rand() < 0.03 ? '2' : '0'
        lines.push(
          `${lat.toFixed(5)},${lon.toFixed(5)},${r.period}-${day},${hhmm},${sat},${instrument},${conf},${(Math.exp(1.5 + rand() * 2)).toFixed(2)},${night ? 'N' : 'D'},${type},${nrt ? 'NRT' : 'SP'}`,
        )
      }
    }
    emit('MODIS', Math.round(r.modis_raw * 1.03))
    emit('VIIRS', Math.round(r.viirs_raw * 1.03))
  }
  return lines.join('\n') + '\n'
}
