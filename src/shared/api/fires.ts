import { getBlob, getJson, USE_MOCKS } from './client'
import { mockAnalyze, mockCalendarCsv, mockHotspotsCsv, mockMeta } from './mocks'
import type { AnalyzeQuery, AnalyzeResult, Meta } from './types'

let meta: Promise<Meta> | null = null

/** GET /meta, fetched once per session; a failed attempt is forgotten so the next call retries. */
export function getMeta(): Promise<Meta> {
  meta ??= (USE_MOCKS ? delay(mockMeta()) : getJson<Meta>('/meta')).catch((e) => {
    meta = null
    throw e
  })
  return meta
}

export const analyze = (q: AnalyzeQuery): Promise<AnalyzeResult> =>
  USE_MOCKS ? delay(mockAnalyze(q)) : getJson<AnalyzeResult>('/analyze', q)

export const calendarCsv = (q: AnalyzeQuery & { granularity: 'month' | 'day' }): Promise<Blob> =>
  USE_MOCKS ? delay(new Blob([mockCalendarCsv(q)], { type: 'text/csv' })) : getBlob('/calendar.csv', q)

export const hotspotsCsv = (q: AnalyzeQuery): Promise<Blob> =>
  USE_MOCKS ? delay(new Blob([mockHotspotsCsv()], { type: 'text/csv' })) : getBlob('/hotspots.csv', q)

// shortcut: fake latency so loading states are visible in the demo; drops out with the mocks.
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 250))
