import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import type { Polygon } from 'geojson'
import { useEffect, useRef } from 'react'
import { useControl, type ControlPosition, type IControl } from 'react-map-gl/maplibre'

// mapbox-gl-draw styles its buttons with mapboxgl-* classes; point them at MapLibre's.
const classes = MapboxDraw.constants.classes as Record<string, string>
classes.CONTROL_BASE = 'maplibregl-ctrl'
classes.CONTROL_PREFIX = 'maplibregl-ctrl-'
classes.CONTROL_GROUP = 'maplibregl-ctrl-group'

const EVENTS = ['draw.create', 'draw.update', 'draw.delete']
// MapLibre's typings don't know mapbox-gl-draw's custom events.
type DrawEvents = { on(e: string, f: () => void): void; off(e: string, f: () => void): void }

type Props = {
  onChange: (polygon: Polygon | null) => void
  position?: ControlPosition
}

export function DrawAreaControl({ onChange, position = 'top-left' }: Props) {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const draw = useRef(
    new MapboxDraw({ displayControlsDefault: false, controls: { polygon: true, trash: true } }),
  ).current

  // Keep a single polygon: drawing a new one replaces the previous.
  const handle = useRef(() => {
    const features = draw.getAll().features
    if (features.length > 1) draw.delete(features.slice(0, -1).map((f) => String(f.id)))
    const geometry = draw.getAll().features.at(-1)?.geometry
    onChangeRef.current(geometry?.type === 'Polygon' ? geometry : null)
  }).current

  useControl(
    () => draw as unknown as IControl,
    ({ map }) => EVENTS.forEach((e) => (map.getMap() as DrawEvents).on(e, handle)),
    ({ map }) => EVENTS.forEach((e) => (map.getMap() as DrawEvents).off(e, handle)),
    { position },
  )
  return null
}
