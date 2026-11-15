import { getBlob, getJson, post } from './client'
import type { AnalyzeQuery, AnalyzeResult, CalendarCsvQuery, GridCell, GridQuery, Meta } from './types'

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

/** Monthly e-mail digest: the address plus the person's explicit consent. Subscribing twice is not an error. */
export const subscribe = (email: string, signal?: AbortSignal) => post('/subscriptions', { email, consent: true }, signal)

// shortcut: GET /grid is not in contract 3 yet; agree the path, parameters and shape with Andriy.
export const getGrid = (q: GridQuery, signal?: AbortSignal) =>
  getJson<GridCell[]>(`/grid?${new URLSearchParams(q)}`, undefined, signal)
