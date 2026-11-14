import type { Polygon } from 'geojson'
import { request, USE_MOCKS } from './client'
import { mockCalendar, mockHotspots } from './mocks'

export type Source = 'modis' | 'viirs' | 'harmonized'

/** One calendar cell: hotspots detected in the area in that month, and the median of the same month in the other years. */
export type CalendarCell = { year: number; month: number; count: number; median: number }

export type Hotspot = { lat: number; lon: number; acquired: string; frp: number }

export type CalendarQuery = { area: Polygon; source: Source; from: number; to: number }
export type HotspotQuery = { area: Polygon; source: Source; year: number; month: number }

/** Months without observations (before the sensor flew, or not yet over) are absent, not zero. */
export function getCalendar(q: CalendarQuery): Promise<CalendarCell[]> {
  const cells = USE_MOCKS
    ? delay(mockCalendar(q))
    : request<CalendarCell[]>('/calendar', { method: 'POST', body: JSON.stringify(q) })
  // Callers read the first and last cell as the period's ends; the backend does not promise an order.
  return cells.then((c) => c.sort((a, b) => a.year - b.year || a.month - b.month))
}

export function getHotspots(q: HotspotQuery): Promise<Hotspot[]> {
  if (USE_MOCKS) return delay(mockHotspots(q))
  return request<Hotspot[]>('/hotspots', { method: 'POST', body: JSON.stringify(q) })
}

// shortcut: fake latency so loading states are visible in the demo; drops out with the mocks.
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 250))
