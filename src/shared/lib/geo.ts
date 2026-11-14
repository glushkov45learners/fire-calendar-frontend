import type { Polygon } from 'geojson'

const KM_PER_DEG_LAT = 111.32

/** A polygon approximating a circle of `km` radius around a point. */
export function circlePolygon(lat: number, lon: number, km: number, steps = 48): Polygon {
  const dLat = km / KM_PER_DEG_LAT
  const dLon = km / (KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180))
  const ring = Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    return [lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]
  })
  return { type: 'Polygon', coordinates: [[...ring, ring[0]]] }
}

/** [west, south, east, north] → closed rectangle ring. */
export function bboxPolygon([w, s, e, n]: [number, number, number, number]): Polygon {
  return { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] }
}

/** [west, south, east, north] of the outer ring. */
export function bbox(p: Polygon): [number, number, number, number] {
  const xs = p.coordinates[0].map((c) => c[0])
  const ys = p.coordinates[0].map((c) => c[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

export function centroid(p: Polygon): [number, number] {
  const [w, s, e, n] = bbox(p)
  return [(w + e) / 2, (s + n) / 2]
}

/** Approximate area in km² (equirectangular shoelace), enough for labels and mock scaling. */
export function areaKm2(p: Polygon): number {
  const ring = p.coordinates[0]
  const lat0 = (centroid(p)[1] * Math.PI) / 180
  let sum = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
  }
  return (Math.abs(sum) / 2) * KM_PER_DEG_LAT * KM_PER_DEG_LAT * Math.cos(lat0)
}
