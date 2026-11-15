import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson'
import type { GridCell } from '@/shared/api'
import { bbox, cellBounds, inBbox, pointInGeometry, type Bbox, type Geometry } from '@/shared/lib/geo'
import { ramp, SEQ } from '@/shared/lib/ramp'

/** The extent of the mockup's map: Ukraine with a margin. [west, south, east, north] */
export const VIEW: Bbox = [22.0, 44.0, 40.5, 52.5]

/**
 * How far the camera may pan: VIEW plus a margin, widest in the south, so a zoomed-in user can drag Crimea and the coast
 * up from under the title and the bottom fade. Zooming out stops at VIEW (minZoom is set from the fit).
 */
export const PAN_BOUNDS: Bbox = [VIEW[0] - 0.5, VIEW[1] - 1.5, VIEW[2] + 0.5, VIEW[3] + 0.3]

/**
 * Squares of the 0.1° grid. `in` marks cells inside `area` (centre in it, the backend's rule; null = all), which the map
 * draws bright and the rest dimmed. Colours are SEQ on a log scale from the smallest to the largest count of the inside
 * cells, so even an area of similar cells spreads over the whole scale; outside cells are clamped to it.
 */
export function heatCells(cells: GridCell[], area: Geometry | null): { fc: FeatureCollection<Polygon>; min: number; max: number } {
  const box = area && bbox(area)
  const all = cells.map((c) => {
    const [w, s, e, n] = cellBounds(c.cell_id)
    const cx = (w + e) / 2
    const cy = (s + n) / 2
    return { ...c, b: [w, s, e, n], in: !area || (inBbox(cx, cy, box!) && pointInGeometry(cx, cy, area)) }
  })
  const shown = all.filter((c) => c.in)
  const max = Math.max(1, ...shown.map((c) => c.count))
  const min = Math.max(1, Math.min(max, ...shown.map((c) => c.count)))
  const t = (v: number) => (max > min ? (Math.log(Math.max(v, min)) - Math.log(min)) / (Math.log(max) - Math.log(min)) : 1)
  const features = all.map(({ cell_id, count, in: inside, b: [w, s, e, n] }): Feature<Polygon> => ({
    type: 'Feature',
    properties: { id: cell_id, count, in: inside, c: ramp(SEQ, t(count)) },
    geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
  }))
  return { fc: { type: 'FeatureCollection', features }, min, max }
}

/** "50.4–50.5° N, 30.1–30.2° E" */
export function cellLabel(id: number): string {
  const [w, s, e, n] = cellBounds(id)
  return `${s.toFixed(1)}–${n.toFixed(1)}° N, ${w.toFixed(1)}–${e.toFixed(1)}° E`
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
