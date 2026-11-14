import type { Polygon } from 'geojson'

// Shapes of contract 3 (context/contract-3-api.md). The contract also allows a MultiPolygon aoi; this app only sends Polygons.

export type Anomaly = 'low' | 'normal' | 'high' | 'extreme'

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

export type AnalyzeQuery = { aoi: Polygon; from: string; to: string }

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

export type CurrentMonth = {
  period: string
  count_h: number
  median: number
  ratio: number | null
  pct: number
  anomaly: Anomaly
  days_observed: number
}

export type AnalyzeResult = {
  area_km2: number
  cells: number
  monthly: MonthlyRow[]
  daily: { date: string; count_h: number; frp_h: number }[]
  current_month: CurrentMonth
  top_years: { year: number; count_h: number }[]
  seasonality: { month: number; median: number; p25: number; p75: number }[]
  totals: { count_h: number; hotspots_raw: number }
}
