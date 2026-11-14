import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { Polygon } from 'geojson'
import { useEffect, useRef, useState } from 'react'
import { useControl, type ControlPosition, type IControl } from 'react-map-gl/maplibre'

// mapbox-gl-draw styles its buttons with mapboxgl-* classes; point them at MapLibre's.
const classes = MapboxDraw.constants.classes as Record<string, string>
classes.CONTROL_BASE = 'maplibregl-ctrl'
classes.CONTROL_PREFIX = 'maplibregl-ctrl-'
classes.CONTROL_GROUP = 'maplibregl-ctrl-group'

const EVENTS = ['draw.create', 'draw.update', 'draw.delete']
// MapLibre's typings don't know mapbox-gl-draw's custom events.
type DrawEvents = { on(e: string, f: () => void): void; off(e: string, f: () => void): void }

const WHITE = '#f0f0fa'
// The design's selection look while drawing: white dashed outline over the black map.
const STYLES = [
  { id: 'fc-fill', type: 'fill', filter: ['==', '$type', 'Polygon'], paint: { 'fill-color': WHITE, 'fill-opacity': 0.06 } },
  { id: 'fc-line', type: 'line', filter: ['in', '$type', 'Polygon', 'LineString'], paint: { 'line-color': WHITE, 'line-width': 1.5, 'line-dasharray': [2, 2] } },
  { id: 'fc-vertex', type: 'circle', filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex']], paint: { 'circle-radius': 4, 'circle-color': WHITE } },
]

type Props = {
  onChange: (polygon: Polygon | null) => void
  /** false once the area comes from elsewhere (a preset, a point): the drawn shape is cleared. */
  active: boolean
  position?: ControlPosition
}

/** Draw one polygon on the map; drawing a new one replaces the last. */
export function DrawAreaControl({ onChange, active, position = 'top-right' }: Props) {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const [draw] = useState(() => new MapboxDraw({ displayControlsDefault: false, controls: { polygon: true, trash: true }, styles: STYLES }))

  const [handle] = useState(() => () => {
    const features = draw.getAll().features
    if (features.length > 1) draw.delete(features.slice(0, -1).map((f) => String(f.id)))
    const geometry = draw.getAll().features.at(-1)?.geometry
    onChangeRef.current(geometry?.type === 'Polygon' ? geometry : null)
  })

  useEffect(() => {
    if (active) return
    try {
      draw.deleteAll()
    } catch {
      // not attached to the map yet: nothing drawn to clear
    }
  }, [active, draw])

  useControl(
    () => draw as unknown as IControl,
    ({ map }) => EVENTS.forEach((e) => (map.getMap() as unknown as DrawEvents).on(e, handle)),
    ({ map }) => EVENTS.forEach((e) => (map.getMap() as unknown as DrawEvents).off(e, handle)),
    { position },
  )
  return null
}
