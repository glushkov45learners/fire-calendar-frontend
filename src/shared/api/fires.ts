import type { Polygon } from 'geojson'
import { request, USE_MOCKS } from './client'
import { mockFireStats } from './mocks'

export type FireStat = { date: string; hotspots: number; risk: number }

export function getFireStats(area: Polygon): Promise<FireStat[]> {
  if (USE_MOCKS) return Promise.resolve(mockFireStats())
  return request<FireStat[]>('/fires/stats', { method: 'POST', body: JSON.stringify({ area }) })
}
