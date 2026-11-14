import type { MultiPolygon, Polygon, Position } from 'geojson'

export type Geometry = Polygon | MultiPolygon
export type Bbox = [number, number, number, number]

const KM_PER_DEG_LAT = 111.32
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** A closed ring of `steps` vertices approximating a circle of `km` radius. Latitude is clamped to ±maxLat. */
export function circlePolygon(lat: number, lon: number, km: number, steps = 64, maxLat = 80): Polygon {
  const la = clamp(lat, -maxLat, maxLat)
  const dLat = km / KM_PER_DEG_LAT
  const dLon = km / (KM_PER_DEG_LAT * Math.cos((la * Math.PI) / 180))
  const ring = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    return [+(lon + dLon * Math.cos(a)).toFixed(5), +(la + dLat * Math.sin(a)).toFixed(5)]
  })
  return { type: 'Polygon', coordinates: [[...ring, ring[0]]] }
}

export function bboxPolygon([w, s, e, n]: Bbox): Polygon {
  return { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] }
}

/** Outer rings of every polygon; holes are ignored throughout (presets and drawn shapes have none). */
export const outerRings = (g: Geometry): Position[][] => (g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]))

export function bbox(g: Geometry): Bbox {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const ring of outerRings(g)) {
    for (const [x, y] of ring) {
      w = Math.min(w, x)
      s = Math.min(s, y)
      e = Math.max(e, x)
      n = Math.max(n, y)
    }
  }
  return [w, s, e, n]
}

export function centroid(g: Geometry): [number, number] {
  const [w, s, e, n] = bbox(g)
  return [(w + e) / 2, (s + n) / 2]
}

/** Approximate area in km² (equirectangular shoelace per ring), enough for labels and mock scaling. */
export function areaKm2(g: Geometry): number {
  return outerRings(g).reduce((total, ring) => {
    const lat0 = ((ring.reduce((a, p) => a + p[1], 0) / ring.length) * Math.PI) / 180
    let sum = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    return total + (Math.abs(sum) / 2) * KM_PER_DEG_LAT * KM_PER_DEG_LAT * Math.cos(lat0)
  }, 0)
}

/** Ray casting against the outer rings. */
export function pointInGeometry(lon: number, lat: number, g: Geometry): boolean {
  return outerRings(g).some((ring) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  })
}

export const inBbox = (lon: number, lat: number, [w, s, e, n]: Bbox) => lon >= w && lon <= e && lat >= s && lat <= n

export function bboxesIntersect(a: Bbox, b: Bbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}
