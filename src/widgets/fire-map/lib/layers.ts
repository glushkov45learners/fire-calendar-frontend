import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson'
import type { GridCell } from '@/shared/api'
import { cellBounds, type Bbox } from '@/shared/lib/geo'
import { ramp, SEQ } from '@/shared/lib/ramp'

/** The extent of the mockup's map: Ukraine with a margin. [west, south, east, north] */
export const VIEW: Bbox = [22.0, 44.0, 40.5, 52.5]

/** Squares of the 0.1° grid, coloured on SEQ by log(count + 1) against the largest count in the data. */
export function heatCells(cells: GridCell[]): { fc: FeatureCollection<Polygon>; max: number } {
  const max = Math.max(1, ...cells.map((c) => c.count))
  const features = cells.map((c): Feature<Polygon> => {
    const [w, s, e, n] = cellBounds(c.cell_id)
    return {
      type: 'Feature',
      properties: { id: c.cell_id, count: c.count, c: ramp(SEQ, Math.log(c.count + 1) / Math.log(max + 1)) },
      geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
    }
  })
  return { fc: { type: 'FeatureCollection', features }, max }
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
