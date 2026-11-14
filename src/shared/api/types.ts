import type { MultiPolygon, Polygon } from 'geojson'

// Shapes of contract 3 (docs/contract-3-api.md), field for field.

export type Aoi = Polygon | MultiPolygon
export type Anomaly = 'low' | 'normal' | 'high' | 'extreme'

/** model_meta.json of contract 2. */
export type ModelMeta = {
  model_version: string
  reference_scale: 'VIIRS_SNPP' | 'MODIS'
  fit_years: number[]
  holdout_years: number[]
  metrics: { mape: number; r2: number; bias: number }
  notes: string
}

export type Meta = {
  coverage_bbox: [number, number, number, number]
  date_min: string
  date_max: string
  grid_step: number
  baseline_years: [number, number]
  model: ModelMeta
}

export type AnalyzeQuery = { aoi: Aoi; from: string; to: string }
export type CalendarCsvQuery = AnalyzeQuery & { granularity: 'month' | 'day' }

export type MonthlyRow = {
  period: string
  count_h: number
  frp_h: number
  modis_raw: number
  viirs_raw: number
  median: number
  z: number
  pct: number
  anomaly: Anomaly
}

export type DailyRow = { date: string; count_h: number; frp_h: number }

export type CurrentMonth = {
  period: string
  count_h: number
  median: number
  ratio: number
  pct: number
  anomaly: Anomaly
  days_observed: number
}

export type AnalyzeResult = {
  area_km2: number
  cells: number
  monthly: MonthlyRow[]
  daily: DailyRow[]
  current_month: CurrentMonth
  top_years: { year: number; count_h: number }[]
  seasonality: { month: number; median: number; p25: number; p75: number }[]
  totals: { count_h: number; hotspots_raw: number }
}

export type ApiErrorCode = 'invalid_aoi' | 'invalid_range' | 'outside_coverage' | 'too_many_rows'
export type ApiErrorBody = { error: { code: ApiErrorCode | string; message: string } }

/** One row of POST /hotspots.csv, typed. */
export type Hotspot = {
  lat: number
  lon: number
  date: string
  time: string
  satellite: string
  instrument: string
  confidence: string
  frp: number
  daynight: string
  /** null for NRT rows, which carry no type. */
  type: number | null
  product: string
}
