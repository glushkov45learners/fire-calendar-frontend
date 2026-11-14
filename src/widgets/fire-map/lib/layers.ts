import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson'
import type { Hotspot } from '@/shared/api'
import { daysInMonth } from '@/shared/lib/format'
import type { Bbox } from '@/shared/lib/geo'
import { ramp, SEQ } from '@/shared/lib/ramp'

/** The extent of the mockup's map: Ukraine with a margin. [west, south, east, north] */
export const VIEW: Bbox = [22.0, 44.0, 40.5, 52.5]

/** public/data/grid.json: all-time MODIS detections per 0.1° cell as base-36 levels, row 0 at the north edge. */
export type HeatGrid = { bbox: Bbox; step: number; gw: number; gh: number; gmax: number; grid: string }

/** One square per non-empty cell, coloured as in the mockup: SEQ at (level / 35)^1.7. The gaps between cells come from the layer's black outline. */
export function heatCells(g: HeatGrid): FeatureCollection<Polygon> {
  const [W, , , N] = g.bbox
  const features: Feature<Polygon>[] = []
  for (let i = 0; i < g.grid.length; i++) {
    const l = parseInt(g.grid[i], 36)
    if (!l) continue
    const w = W + (i % g.gw) * g.step
    const n = N - Math.floor(i / g.gw) * g.step
    const e = w + g.step
    const s = n - g.step
    features.push({
      type: 'Feature',
      properties: { c: ramp(SEQ, Math.pow(l / 35, 1.7)) },
      geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Meridians every 4° and parallels every 2°, as in the mockup. */
export function graticule([w, s, e, n]: Bbox): FeatureCollection<LineString> {
  const line = (coordinates: number[][]): Feature<LineString> => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } })
  const features = [
    ...[24, 28, 32, 36, 40].map((lon) => line([[lon, s], [lon, n]])),
    ...[46, 48, 50, 52].map((lat) => line([[w, lat], [e, lat]])),
  ]
  return { type: 'FeatureCollection', features }
}

/** Corner brackets of the selection box, a quarter of its shorter side long. */
export function brackets([w, s, e, n]: Bbox): FeatureCollection<LineString> {
  const t = Math.min(e - w, n - s) * 0.25
  const corners = [
    [[w, n - t], [w, n], [w + t, n]],
    [[e - t, n], [e, n], [e, n - t]],
    [[e, s + t], [e, s], [e - t, s]],
    [[w + t, s], [w, s], [w, s + t]],
  ]
  return { type: 'FeatureCollection', features: corners.map((c) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } })) }
}

/**
 * At most `max` points, spread evenly over the month and drawn oldest first so the newest sit on top.
 * `t` is the point's age within its month: 0 on the 1st, 1 on the last day.
 */
export function pointLayer(points: Hotspot[], max: number): FeatureCollection<Point> {
  const sorted = [...points].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const stride = Math.max(1, sorted.length / max)
  const picked = sorted.length <= max ? sorted : Array.from({ length: max }, (_, i) => sorted[Math.floor(i * stride)])
  return {
    type: 'FeatureCollection',
    features: picked.map((h) => {
      const [y, m, d] = h.date.split('-').map(Number)
      const dim = daysInMonth(y, m)
      return { type: 'Feature', properties: { t: dim > 1 ? (d - 1) / (dim - 1) : 1 }, geometry: { type: 'Point', coordinates: [h.lon, h.lat] } }
    }),
  }
}

/** Colours of point age: cool for the first days of the month, warm for the last; distinct from the SEQ heat grid under them. */
export const AGE_STOPS = ['#4a90c8', '#9ecae8', '#f0f0fa', '#fbb61a'] as const
