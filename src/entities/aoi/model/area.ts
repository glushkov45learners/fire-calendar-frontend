import type { Feature, FeatureCollection, Polygon } from 'geojson'
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
// The 24 oblasts, Crimea, Kyiv and Sevastopol (geoBoundaries ADM1, © OpenStreetMap contributors, ODbL 1.0), simplified to ~1 km.
// The map draws the same file as oblast borders. Enclaves are kept: Kyiv is a hole in Kyiv Oblast.
import oblasts from './oblasts.json'
import { decodePolygon, encodePolygon } from './polygon-codec'

/** An area of interest. `geometry` is exactly what goes to the API as `aoi`. */
export type Area = {
  kind: 'preset' | 'point' | 'drawn'
  id: string
  name: string
  short: string
  geometry: Geometry
  /** The whole country: the map draws its border brighter and no selection box. */
  whole?: boolean
  /** Other names the search accepts (Ukrainian, older spellings); never shown. */
  aliases?: string[]
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

type RegionProps = { id: string; name: string; short: string; aliases: string[] }
export const OBLASTS = oblasts as FeatureCollection<Geometry, RegionProps>

/** Administrative units: not shown as tiles, found by search and restored from links. */
export const REGIONS: Area[] = OBLASTS.features.map((f: Feature<Geometry, RegionProps>) => ({ kind: 'preset', ...f.properties, geometry: f.geometry }))

const SAVED = [...PRESETS, ...REGIONS]

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

/** Short stable id for a shape: the same polygon always gets the same one, so it can key effects and file names. */
const shapeId = (code: string) => {
  let h = 2166136261
  for (let i = 0; i < code.length; i++) h = Math.imul(h ^ code.charCodeAt(i), 16777619)
  return `drawn-${(h >>> 0).toString(36)}`
}

function polygonArea(polygon: Polygon): Area {
  return { kind: 'drawn', id: shapeId(encodePolygon(polygon)), name: 'Drawn area', short: 'Drawn area', geometry: polygon }
}

/** The polygon is rounded to the precision the URL keeps (~11 m), so the area on screen is the one a shared link restores. */
export function drawnArea(polygon: Polygon): Area {
  return polygonArea(decodePolygon(encodePolygon(polygon)) ?? polygon)
}

/** "lat, lon" or "lat lon" → numbers, or null. */
export function parseLatLon(s: string): [number, number] | null {
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/)
  return m ? [+m[1], +m[2]] : null
}

/** Saved areas whose name, short name, id or alias contains the query; names that start with it come first. */
export function searchAreas(q: string, limit = 6): Area[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const rank = (a: Area) => {
    const names = [a.name, a.short, a.id, ...(a.aliases ?? [])].map((n) => n.toLowerCase())
    if (names.some((n) => n === s)) return 0
    if (names.some((n) => n.startsWith(s))) return 1
    return names.some((n) => n.includes(s)) ? 2 : -1
  }
  return SAVED.map((a) => ({ a, r: rank(a) }))
    .filter((x) => x.r >= 0)
    .sort((x, y) => x.r - y.r)
    .slice(0, limit)
    .map((x) => x.a)
}

const POLY_PREFIX = 'p.'

/** URL form: a preset id, "lat,lon,km" for a point, "p.<code>" for a drawn polygon (see polygon-codec). */
export const areaToParam = (a: Area) => (a.kind === 'drawn' ? POLY_PREFIX + encodePolygon(a.geometry as Polygon) : a.id)

export function areaFromParam(v: string | null): Area | null {
  if (!v) return null
  const preset = SAVED.find((p) => p.id === v)
  if (preset) return preset
  if (v.startsWith(POLY_PREFIX)) {
    const polygon = decodePolygon(v.slice(POLY_PREFIX.length))
    return polygon && polygonArea(polygon)
  }
  const m = v.split(',').map(Number)
  if (m.length === 3 && m.every(Number.isFinite) && isInCoverage(m[0], m[1])) return pointArea(m[0], m[1], m[2])
  return null
}
