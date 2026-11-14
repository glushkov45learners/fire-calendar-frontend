// Loaded lazily by FireMap: maplibre-gl and mapbox-gl-draw are most of the app's weight, and the page is readable without them.
import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, Polygon } from 'geojson'
import { useMemo, useRef } from 'react'
import Map, { Layer, Marker, NavigationControl, Source, type MapRef, type StyleSpecification } from 'react-map-gl/maplibre'
import { UKRAINE_BORDER, type Area } from '@/entities/aoi'
import { DrawAreaControl } from '@/features/draw-area'
import { bbox } from '@/shared/lib/geo'
import { brackets, graticule, PAN_BOUNDS, VIEW } from '../lib/layers'

// Vite bundles maplibre-gl, which breaks its own import.meta.url lookup of the worker file.
// This instance is passed to <Map mapLib>, since react-map-gl would otherwise load a second copy.
maplibregl.setWorkerUrl(workerUrl)

/** No basemap tiles: a black canvas, as in the design. Everything on it is our own data. */
const STYLE: StyleSpecification = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#000' } }] }

const CITIES: [string, number, number][] = [
  ['Kyiv', 50.45, 30.52],
  ['Kharkiv', 49.99, 36.23],
  ['Odesa', 46.48, 30.73],
  ['Lviv', 49.84, 24.03],
  ['Dnipro', 48.46, 35.05],
]

const LINES = graticule(VIEW)

type Props = {
  area: Area
  cells: FeatureCollection<Polygon> | null
  onDraw: (polygon: Polygon | null) => void
  /** The heat cell under the pointer, with the pointer's position in the map; null when off the grid. */
  onHover: (cell: { id: number; count: number; x: number; y: number } | null) => void
}

export default function MapCanvas({ area, cells, onDraw, onHover }: Props) {
  const ref = useRef<MapRef>(null)
  const box = bbox(area.geometry)
  const marks = useMemo(() => brackets(box), [box[0], box[1], box[2], box[3]]) // eslint-disable-line react-hooks/exhaustive-deps
  // Fit the country, then forbid zooming out past it. minZoom is reset first so the fit can zoom out after the frame grows.
  const fitCountry = () => {
    const map = ref.current?.getMap()
    if (!map) return
    map.setMinZoom(0)
    map.fitBounds([VIEW[0], VIEW[1], VIEW[2], VIEW[3]], { padding: 0, animate: false })
    map.setMinZoom(map.getZoom())
  }

  return (
    <Map
      ref={ref}
      mapLib={maplibregl}
      mapStyle={STYLE}
      initialViewState={{ bounds: VIEW, fitBoundsOptions: { padding: 0 } }}
      // Kept around Ukraine: panning stops a little past the country (more in the south), zooming out stops at the country, one world copy.
      maxBounds={PAN_BOUNDS}
      maxZoom={9}
      renderWorldCopies={false}
      maxPitch={0}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
      dragRotate={false}
      touchPitch={false}
      cooperativeGestures
      // The scene keeps the map's proportions, so after any resize the country fits again.
      onResize={fitCountry}
      // No rotation from touch twist or the keyboard either; the map is a flat, north-up figure.
      onLoad={(e) => {
        e.target.touchZoomRotate.disableRotation()
        e.target.keyboard.disableRotation()
        fitCountry()
      }}
      // shortcut: clicking a cell does nothing yet; it could later select the cell as the area.
      interactiveLayerIds={cells ? ['heat'] : []}
      onMouseMove={(e) => {
        const p = e.features?.[0]?.properties
        onHover(p ? { id: Number(p.id), count: Number(p.count), x: e.point.x, y: e.point.y } : null)
      }}
      onMouseLeave={() => onHover(null)}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <DrawAreaControl onChange={onDraw} active={area.kind === 'drawn'} position="top-right" />

      <Source id="graticule" type="geojson" data={LINES}>
        <Layer id="graticule" type="line" paint={{ 'line-color': 'rgba(240,240,250,0.09)', 'line-width': 1 }} />
      </Source>
      {cells && (
        <Source id="heat" type="geojson" data={cells}>
          <Layer id="heat" type="fill" paint={{ 'fill-color': ['get', 'c'], 'fill-outline-color': '#000', 'fill-opacity': 0.95 }} />
        </Source>
      )}
      <Source id="border" type="geojson" data={UKRAINE_BORDER}>
        <Layer id="border" type="line" paint={{ 'line-color': '#f0f0fa', 'line-opacity': area.whole ? 0.9 : 0.32, 'line-width': 1 }} />
      </Source>
      {!area.whole && (
        <Source id="area" type="geojson" data={area.geometry}>
          <Layer id="area-fill" type="fill" paint={{ 'fill-color': '#f0f0fa', 'fill-opacity': 0.06 }} />
          <Layer id="area-line" type="line" paint={{ 'line-color': '#fff', 'line-width': 1, 'line-dasharray': [5, 4] }} />
        </Source>
      )}
      {!area.whole && (
        <Source id="brackets" type="geojson" data={marks}>
          <Layer id="brackets" type="line" paint={{ 'line-color': '#fff', 'line-width': 2.5 }} />
        </Source>
      )}
      {CITIES.map(([name, lat, lon]) => (
        <Marker key={name} longitude={lon} latitude={lat} anchor="left" offset={[-3, 0]}>
          <span className="city">{name}</span>
        </Marker>
      ))}
      {!area.whole && (
        <Marker longitude={box[2]} latitude={box[3]} anchor="bottom-left">
          <span className="callout">
            <svg width="104" height="34" viewBox="0 0 104 34" aria-hidden="true">
              <path d="M0 34L34 0H104" />
            </svg>
            <span>{area.short}</span>
          </span>
        </Marker>
      )}
    </Map>
  )
}
