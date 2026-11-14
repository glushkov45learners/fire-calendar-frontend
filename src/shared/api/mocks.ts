// shortcut: stand-in for the backend of contract 3, built from real monthly MODIS / VIIRS S-NPP counts for four Ukrainian areas
// (taken from the design mockup). Custom areas reuse the nearest preset scaled by area. Set VITE_USE_MOCKS=false once the API is up.
import type { Polygon } from 'geojson'
import { areaKm2, bboxPolygon, centroid } from '@/shared/lib/geo'
import { median, quantile } from '@/shared/lib/stats'
import data from './mock-calendar.json'
import type { AnalyzeQuery, AnalyzeResult, Anomaly, Meta, MonthlyRow } from './types'

type Bbox = [number, number, number, number]
const AREAS = data.areas as unknown as Record<string, Bbox> // JSON arrays type as number[]
const BASELINE: [number, number] = [2001, 2025]
const DATE_MIN = '2000-11-01'
// The mock archive ends mid-November 2026, so that month is the incomplete "current" one.
const DATE_MAX = '2026-11-14'

export function mockMeta(): Meta {
  return {
    coverage_bbox: [22.0, 44.0, 40.3, 52.4],
    date_min: DATE_MIN,
    date_max: DATE_MAX,
    grid_step: 0.1,
    baseline_years: BASELINE,
    model: {
      model_version: 'v0',
      reference_scale: 'VIIRS_SNPP',
      fit_years: [2012, 2021],
      holdout_years: [2022, 2025],
      metrics: { mape: 0.21, r2: 0.87, bias: -0.03 },
      notes: 'Constant MODIS→VIIRS ratio per area, fitted on the 2012–2025 overlap. 2000–2002: Terra only.',
    },
  }
}

/** Smallest preset whose box holds the centre of the aoi, and how much bigger or smaller the aoi is. */
function pick(aoi: Polygon): { key: string; scale: number } {
  const [lon, lat] = centroid(aoi)
  const area = (b: Bbox) => areaKm2(bboxPolygon(b))
  const key =
    Object.keys(AREAS)
      .filter((k) => k !== 'ua')
      .filter((k) => lon >= AREAS[k][0] && lon <= AREAS[k][2] && lat >= AREAS[k][1] && lat <= AREAS[k][3])
      .sort((a, b) => area(AREAS[a]) - area(AREAS[b]))[0] ?? 'ua'
  return { key, scale: Math.min(1, areaKm2(aoi) / area(AREAS[key])) }
}

const period = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`
const inBaseline = (p: string) => +p.slice(0, 4) >= BASELINE[0] && +p.slice(0, 4) <= BASELINE[1]

function classify(pct: number): Anomaly {
  if (pct >= 95) return 'extreme'
  if (pct >= 75) return 'high'
  if (pct <= 10) return 'low'
  return 'normal'
}

function monthly(aoi: Polygon): MonthlyRow[] {
  const { key, scale } = pick(aoi)
  const modis = data.cal.modis[key as keyof typeof data.cal.modis]
  const viirs = data.cal.viirs[key as keyof typeof data.cal.viirs]
  // VIIRS detections per MODIS detection over the overlap: the whole "model" of v0.
  let v = 0
  let mo = 0
  for (let y = 2012; y <= 2025; y++) {
    for (let m = 0; m < 12; m++) {
      v += viirs[y - data.y0][m]
      mo += modis[y - data.y0][m]
    }
  }
  const ratio = mo ? v / mo : 1

  const rows: Omit<MonthlyRow, 'median' | 'z' | 'pct' | 'anomaly'>[] = []
  for (let i = 0; i < modis.length; i++) {
    const y = data.y0 + i
    for (let m = 1; m <= 12; m++) {
      const p = period(y, m)
      if (p < DATE_MIN.slice(0, 7) || p > DATE_MAX.slice(0, 7)) continue
      const modisRaw = Math.round(modis[i][m - 1] * scale)
      const viirsRaw = y >= 2012 ? Math.round(viirs[i][m - 1] * scale) : 0
      const count = y >= 2012 ? viirsRaw : modisRaw * ratio
      rows.push({ period: p, count_h: +count.toFixed(1), frp_h: +(count * 11.6).toFixed(1), modis_raw: modisRaw, viirs_raw: viirsRaw })
    }
  }

  return rows.map((r) => {
    const base = rows.filter((o) => o.period.slice(5) === r.period.slice(5) && inBaseline(o.period)).map((o) => o.count_h)
    const mean = base.reduce((a, b) => a + b, 0) / base.length
    const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length)
    const pct = Math.round((100 * (base.filter((b) => b < r.count_h).length + base.filter((b) => b === r.count_h).length / 2)) / base.length)
    return { ...r, median: median(base), z: sd ? +((r.count_h - mean) / sd).toFixed(2) : 0, pct, anomaly: classify(pct) }
  })
}

export function mockAnalyze(q: AnalyzeQuery): AnalyzeResult {
  const rows = monthly(q.aoi)
  const inRange = rows.filter((r) => r.period >= q.from.slice(0, 7) && r.period <= q.to.slice(0, 7))
  const cur = rows.at(-1)!
  const years = new Map<number, number>()
  for (const r of rows.filter((o) => inBaseline(o.period))) years.set(+r.period.slice(0, 4), (years.get(+r.period.slice(0, 4)) ?? 0) + r.count_h)
  const area = areaKm2(q.aoi)
  return {
    area_km2: +area.toFixed(1),
    cells: Math.max(1, Math.round(area / 80)), // a 0.1° cell over Ukraine is ~80 km²
    monthly: rows,
    daily: [], // shortcut: the mock has monthly counts only
    current_month: {
      period: cur.period,
      count_h: cur.count_h,
      median: cur.median,
      ratio: cur.median ? +(cur.count_h / cur.median).toFixed(2) : null,
      pct: cur.pct,
      anomaly: cur.anomaly,
      days_observed: +DATE_MAX.slice(8),
    },
    top_years: [...years].map(([year, count_h]) => ({ year, count_h: +count_h.toFixed(1) })).sort((a, b) => b.count_h - a.count_h),
    seasonality: Array.from({ length: 12 }, (_, i) => {
      const base = rows.filter((r) => +r.period.slice(5) === i + 1 && inBaseline(r.period)).map((r) => r.count_h)
      return { month: i + 1, median: median(base), p25: quantile(base, 0.25), p75: quantile(base, 0.75) }
    }),
    totals: {
      count_h: +inRange.reduce((a, r) => a + r.count_h, 0).toFixed(1),
      hotspots_raw: inRange.reduce((a, r) => a + r.modis_raw + r.viirs_raw, 0),
    },
  }
}

export function mockCalendarCsv(q: AnalyzeQuery & { granularity: 'month' | 'day' }): string {
  if (q.granularity === 'day') return 'date,count_h,frp_h,modis_raw,viirs_raw\n'
  const cols = ['period', 'count_h', 'frp_h', 'modis_raw', 'viirs_raw', 'median', 'z', 'pct', 'anomaly'] as const
  const rows = mockAnalyze(q).monthly.filter((r) => r.period >= q.from.slice(0, 7) && r.period <= q.to.slice(0, 7))
  return [cols.join(','), ...rows.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n'
}

// shortcut: no raw FIRMS points in the mock; the real file comes from POST /hotspots.csv.
export const mockHotspotsCsv = () =>
  'latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,frp,daynight,type,product\n'
