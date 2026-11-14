import type { Polygon } from 'geojson'
import { circlePolygon } from '@/shared/lib/geo'

export type RegionView = { longitude: number; latitude: number; zoom: number }
export type Region = { id: string; name: string; area: Polygon; view: RegionView }

const ring = (pts: [number, number][]): Polygon => ({ type: 'Polygon', coordinates: [[...pts, pts[0]]] })

// shortcut: outlines are hand-simplified (~0.3° accuracy); swap for official boundaries from the backend if precision matters.
export const REGION_PRESETS: Region[] = [
  {
    id: 'ukraine',
    name: 'Ukraine',
    view: { longitude: 31.2, latitude: 48.6, zoom: 4.6 },
    area: ring([
      [22.15, 48.4], [22.7, 49.6], [23.6, 50.4], [24.0, 50.8], [23.6, 51.5], [24.6, 51.9], [26.0, 51.9],
      [27.8, 51.6], [29.3, 51.4], [30.5, 51.3], [30.9, 52.0], [32.2, 52.1], [33.8, 52.35], [34.4, 51.7],
      [35.4, 51.0], [36.6, 50.3], [38.0, 50.0], [39.7, 49.6], [40.1, 48.9], [39.7, 47.8], [38.2, 47.1],
      [36.8, 46.7], [35.0, 46.3], [34.8, 45.8], [36.5, 45.4], [35.0, 44.5], [33.5, 44.4], [32.5, 45.4],
      [31.7, 46.3], [30.8, 46.5], [30.2, 45.8], [29.6, 45.3], [28.2, 45.5], [28.9, 46.4], [30.0, 46.4],
      [29.9, 47.0], [29.2, 47.9], [27.7, 48.4], [26.6, 48.3], [24.9, 47.7], [23.2, 48.0],
    ]),
  },
  {
    id: 'chernobyl',
    name: 'Chernobyl Exclusion Zone',
    view: { longitude: 30.0, latitude: 51.35, zoom: 8.4 },
    // The zone was drawn as a 30 km radius around the plant.
    area: circlePolygon(51.389, 30.099, 30),
  },
  {
    id: 'chilecito',
    name: 'Chilecito, La Rioja, Argentina',
    view: { longitude: -67.55, latitude: -29.15, zoom: 7.6 },
    area: ring([[-68.0, -28.75], [-67.15, -28.75], [-67.15, -29.55], [-68.0, -29.55]]),
  },
]

export const DEFAULT_REGION = REGION_PRESETS[0]

export const findRegion = (id: string | null) => REGION_PRESETS.find((r) => r.id === id)
