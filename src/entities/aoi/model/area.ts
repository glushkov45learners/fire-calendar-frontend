import type { Polygon } from 'geojson'
import { COVERAGE_BBOX, DEFAULT_RADIUS_KM, MAX_ABS_LAT, MAX_RADIUS_KM, UKRAINE_BORDER } from '@/shared/config'
import { circlePolygon, inBbox, type Geometry } from '@/shared/lib/geo'
// Donetsk and Luhansk oblasts merged into one outline and simplified (~0.008°, 400 points).
// Administrative boundaries courtesy of geoBoundaries.org (ADM1, 2017), © OpenStreetMap contributors, ODbL 1.0.
import donbas from './donbas.json'
// The exclusion zone: outer boundary of the Chornobyl Radiation and Ecological Biosphere Reserve (OSM relation 12045006),
// without its hole around the plant, so Pripyat and Chornobyl are inside; simplified to ~0.003°. © OpenStreetMap contributors, ODbL 1.0.
import chornobyl from './chornobyl.json'
// shortcut: the Lower Dnipro sub-basin (M5.1.3) traced from a raster map of the Dnipro basin plan and georeferenced on 8 cities
// (error 1–11 km, the map's pixel is ~2 km); replace with the official vector boundary when the team has it.
import lowerDnipro from './lower-dnipro.json'

/** An area of interest. `geometry` is exactly what goes to the API as `aoi`. */
export type Area = {
  kind: 'preset' | 'point' | 'drawn'
  id: string
  name: string
  short: string
  geometry: Geometry
  /** The whole country: the map draws its border brighter and no selection box. */
  whole?: boolean
}

export { UKRAINE_BORDER }

// Order and boxes as in the design mockup.
export const PRESETS: Area[] = [
  { kind: 'preset', id: 'chornobyl', name: 'Chornobyl exclusion zone', short: 'Chornobyl zone', geometry: chornobyl as Polygon },
  // id stays 'kherson' so existing links keep working.
  { kind: 'preset', id: 'kherson', name: 'Lower Dnipro basin', short: 'Lower Dnipro', geometry: lowerDnipro as Polygon },
  { kind: 'preset', id: 'donbas', name: 'Donbas', short: 'Donbas', geometry: donbas as Polygon },
  { kind: 'preset', id: 'ua', name: 'Ukraine', short: 'All of Ukraine', geometry: UKRAINE_BORDER, whole: true },
]

export const DEFAULT_AREA = PRESETS[0]

export const isInCoverage = (lat: number, lon: number) => inBbox(lon, lat, COVERAGE_BBOX)

const round = (v: number) => +v.toFixed(4)

/** A circle of `km` around a point, as a 64-vertex polygon. Latitude is clamped to ±80°, radius to 1–500 km. */
export function pointArea(lat: number, lon: number, km = DEFAULT_RADIUS_KM): Area {
  const la = round(Math.max(-MAX_ABS_LAT, Math.min(MAX_ABS_LAT, lat)))
  const lo = round(lon)
  const r = Math.max(1, Math.min(MAX_RADIUS_KM, Math.round(km)))
  return {
    kind: 'point',
    id: `${la},${lo},${r}`,
    name: `${Math.abs(la).toFixed(2)}° ${la >= 0 ? 'N' : 'S'}, ${Math.abs(lo).toFixed(2)}° ${lo >= 0 ? 'E' : 'W'}`,
    short: `${r} km around point`,
    geometry: circlePolygon(la, lo, r, 64, MAX_ABS_LAT),
  }
}

let drawnCount = 0
export function drawnArea(polygon: Polygon): Area {
  drawnCount += 1
  return { kind: 'drawn', id: `drawn-${drawnCount}`, name: 'Drawn area', short: 'Drawn area', geometry: polygon }
}

/** "lat, lon" or "lat lon" → numbers, or null. */
export function parseLatLon(s: string): [number, number] | null {
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  return m ? [+m[1], +m[2]] : null
}

export function matchPreset(q: string): Area | undefined {
  const s = q.trim().toLowerCase()
  return s ? PRESETS.find((r) => r.name.toLowerCase().includes(s) || r.short.toLowerCase().includes(s) || r.id === s) : undefined
}

/** URL form: a preset id, "lat,lon,km" for a point, "drawn" for a drawn shape (not restorable). */
export const areaToParam = (a: Area) => (a.kind === 'drawn' ? 'drawn' : a.id)

export function areaFromParam(v: string | null): Area | null {
  if (!v) return null
  const preset = PRESETS.find((p) => p.id === v)
  if (preset) return preset
  const m = v.split(',').map(Number)
  if (m.length === 3 && m.every(Number.isFinite) && isInCoverage(m[0], m[1])) return pointArea(m[0], m[1], m[2])
  return null
}
