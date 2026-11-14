import type { Polygon } from 'geojson'
import { bboxPolygon, circlePolygon } from '@/shared/lib/geo'

/** `km2` overrides the label when the aoi is only a stand-in (the country's box). */
export type Region = { id: string; name: string; short: string; aoi: Polygon; whole?: boolean; km2?: number }

/** Radius of the area drawn around a point typed as "lat, lon". */
export const POINT_RADIUS_KM = 25

export const REGION_PRESETS: Region[] = [
  { id: 'chornobyl', name: 'Chornobyl exclusion zone', short: 'Chornobyl zone', aoi: bboxPolygon([29.25, 51.1, 30.65, 51.6]) },
  { id: 'kherson', name: 'Lower Dnipro, Kherson', short: 'Lower Dnipro', aoi: bboxPolygon([32, 46.2, 34.2, 47.1]) },
  { id: 'donbas', name: 'Donbas front line', short: 'Donbas', aoi: bboxPolygon([37, 47.8, 39.5, 49.5]) },
  // The backend clips to the coverage (cells with data), so the country's box stands in for its border.
  { id: 'ua', name: 'Ukraine', short: 'All of Ukraine', aoi: bboxPolygon([22.14, 44.39, 40.23, 52.38]), whole: true, km2: 603_550 },
]

export const DEFAULT_REGION = REGION_PRESETS[0]

export function pointRegion(lat: number, lon: number): Region {
  return {
    id: `${lat.toFixed(3)},${lon.toFixed(3)}`,
    name: `${lat.toFixed(2)}° N, ${lon.toFixed(2)}° E`,
    short: `${POINT_RADIUS_KM} km around point`,
    aoi: circlePolygon(lat, lon, POINT_RADIUS_KM),
  }
}

/** "lat, lon" or "lat lon" → numbers, or null. */
export function parseLatLon(s: string): [number, number] | null {
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  return m ? [+m[1], +m[2]] : null
}

/** A region from its URL id: a preset id or "lat,lon". */
export function findRegion(id: string | null): Region | null {
  const preset = REGION_PRESETS.find((r) => r.id === id)
  if (preset || !id) return preset ?? null
  const ll = parseLatLon(id)
  return ll && Math.abs(ll[0]) <= 90 && Math.abs(ll[1]) <= 180 ? pointRegion(ll[0], ll[1]) : null
}

export function matchRegion(q: string): Region | undefined {
  const s = q.trim().toLowerCase()
  return s ? REGION_PRESETS.find((r) => r.name.toLowerCase().includes(s) || r.short.toLowerCase().includes(s)) : undefined
}
