import { parseCsv } from '@/shared/lib/csv'
import { getBlob, getJson } from './client'
import type { AnalyzeQuery, AnalyzeResult, CalendarCsvQuery, Hotspot, Meta } from './types'

export const getMeta = (signal?: AbortSignal) => getJson<Meta>('/meta', undefined, signal)

/** The contract does not promise an order; everything downstream reads `monthly` and `daily` as sorted by time. */
export function sortAnalyze(r: AnalyzeResult): AnalyzeResult {
  return {
    ...r,
    monthly: [...r.monthly].sort((a, b) => a.period.localeCompare(b.period)),
    daily: [...r.daily].sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export const analyze = (q: AnalyzeQuery, signal?: AbortSignal) =>
  getJson<AnalyzeResult>('/analyze', q, signal).then(sortAnalyze)

export const calendarCsv = (q: CalendarCsvQuery, signal?: AbortSignal) => getBlob('/calendar.csv', q, signal)
export const hotspotsCsv = (q: AnalyzeQuery, signal?: AbortSignal) => getBlob('/hotspots.csv', q, signal)

/** Vegetation fires only: `type` 0, or empty on NRT rows. Industrial sources (2, 3) and volcanoes (1) are dropped. */
export function parseHotspots(csv: string): Hotspot[] {
  return parseCsv(csv)
    .map((r) => ({
      lat: +r.latitude,
      lon: +r.longitude,
      date: r.acq_date,
      time: r.acq_time,
      satellite: r.satellite,
      instrument: r.instrument,
      confidence: r.confidence,
      frp: +r.frp,
      daynight: r.daynight,
      type: r.type === '' ? null : +r.type,
      product: r.product,
    }))
    .filter((h) => (h.type === 0 || h.type === null) && Number.isFinite(h.lat) && Number.isFinite(h.lon))
}

// shortcut: the map reads points from the CSV export; switch to a JSON endpoint if the backend adds one.
export const getHotspots = (q: AnalyzeQuery, signal?: AbortSignal) =>
  hotspotsCsv(q, signal)
    .then((b) => b.text())
    .then(parseHotspots)
