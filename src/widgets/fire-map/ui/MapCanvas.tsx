// Loaded lazily by FireMap: maplibre-gl and mapbox-gl-draw are most of the app's weight, and the page is readable without them.
import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, Polygon } from 'geojson'
import { useEffect, useMemo, useRef } from 'react'
import Map, { Layer, Marker, NavigationControl, Source, type MapRef, type StyleSpecification } from 'react-map-gl/maplibre'
import { UKRAINE_BORDER, type Area } from '@/entities/aoi'
import { DrawAreaControl } from '@/features/draw-area'
import { bbox } from '@/shared/lib/geo'
import { brackets, graticule, PAN_BOUNDS, VIEW } from '../lib/layers'
// Oblast borders (geoBoundaries ADM1, © OpenStreetMap contributors), simplified to ~1 km, as lines.
import oblasts from '../model/oblasts.json'

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
/** A zone whose east edge is past this longitude gets its callout on the left, away from the map's eastern edge. */
const CALLOUT_FLIP_LON = 36.5
/** Same breakpoint as the phone layout in index.css. */
const PHONE_MAX = 720

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
  // Zones reaching the east sit against the locked map edge: their callout goes up-left from the top-left corner instead.
  const calloutLeft = box[2] > CALLOUT_FLIP_LON
  const marks = useMemo(() => brackets(box), [box[0], box[1], box[2], box[3]]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Zooming out stops at the whole country (minZoom from the frame's size), then the camera frames the selected area:
   * the country for "All of Ukraine", else the area's box, kept clear of the title in the bottom-left corner.
   */
  const frame = (animate: boolean) => {
    const map = ref.current?.getMap()
    if (!map) return
    const country = map.cameraForBounds([VIEW[0], VIEW[1], VIEW[2], VIEW[3]], { padding: 0 })
    // A frame of zero or tiny size gives a zoom outside MapLibre's range; clamp it, and skip a non-number.
    if (country?.zoom !== undefined && Number.isFinite(country.zoom)) map.setMinZoom(Math.min(map.getMaxZoom(), Math.max(0, country.zoom)))
    const { clientWidth: w, clientHeight: h } = map.getContainer()
    const target = area.whole ? VIEW : box
    // Room for the title (bottom-left) and for the callout (~260 px wide, ~50 px up) on its side, plus the map buttons on the right.
    if (w < 80 || h < 80) return // not laid out yet (lazy chunk, hidden tab): onResize frames it later
    // Phones hide the callout (the title already names the area), so it needs no room there.
    const callout = w <= PHONE_MAX ? w * 0.12 : Math.max(w * 0.12, Math.min(320, w * 0.45))
    const raw = { top: Math.max(h * 0.12, 60), bottom: h * 0.32, left: calloutLeft ? callout : w * 0.1, right: calloutLeft ? w * 0.12 : callout }
    // On a small frame (phones) the paddings must still leave room for the area, or MapLibre refuses to fit at all.
    const kx = Math.min(1, (w * 0.6) / (raw.left + raw.right))
    const ky = Math.min(1, (h * 0.6) / (raw.top + raw.bottom))
    const padding = area.whole ? 0 : { top: raw.top * ky, bottom: raw.bottom * ky, left: raw.left * kx, right: raw.right * kx }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    map.fitBounds([target[0], target[1], target[2], target[3]], { padding, maxZoom: 9, duration: animate && !reduced ? 900 : 0 })
  }

  // The grid and the outlines are added after mapbox-gl-draw's layers, so a polygon being drawn or edited would sit under the
  // cells. Lift the draw layers to the top whenever the grid or the area changes, and while drawing.
  useEffect(() => {
    const map = ref.current?.getMap()
    if (!map) return
    const lift = () => {
      for (const l of map.getStyle()?.layers ?? []) if ('source' in l && String(l.source).startsWith('mapbox-gl-draw')) map.moveLayer(l.id)
    }
    if (map.isStyleLoaded()) lift()
    // MapLibre's typings don't know mapbox-gl-draw's custom events.
    const ev = map as unknown as { on(e: string, f: () => void): void; off(e: string, f: () => void): void }
    const events = ['draw.modechange', 'draw.create', 'load']
    events.forEach((e) => ev.on(e, lift))
    return () => events.forEach((e) => ev.off(e, lift))
  }, [cells, area.id])

  // A new area: fly to it. (Before the map has loaded there is nothing to move; onLoad frames it.)
  useEffect(() => {
    frame(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area.id])

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
      // After any resize (menu collapsed, window resized) the selected area is framed again.
      onResize={() => frame(false)}
      // No rotation from touch twist or the keyboard either; the map is a flat, north-up figure.
      onLoad={(e) => {
        e.target.touchZoomRotate.disableRotation()
        e.target.keyboard.disableRotation()
        frame(false)
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
          {/* Cells outside the selected area are dimmed hard. beforeId: the grid loads after the outlines and oblast lines, and must stay under them. */}
          <Layer
            id="heat"
            type="fill"
            beforeId="oblasts"
            paint={{ 'fill-color': ['get', 'c'], 'fill-outline-color': '#000', 'fill-opacity': ['case', ['get', 'in'], 0.95, 0.25] }}
          />
        </Source>
      )}
      <Source id="oblasts" type="geojson" data={oblasts as GeoJSON.FeatureCollection}>
        <Layer id="oblasts" type="line" paint={{ 'line-color': '#f0f0fa', 'line-opacity': 0.28, 'line-width': 0.8 }} />
      </Source>
      <Source id="border" type="geojson" data={UKRAINE_BORDER}>
        <Layer id="border" type="line" paint={{ 'line-color': '#f0f0fa', 'line-opacity': area.whole ? 0.9 : 0.32, 'line-width': 1 }} />
      </Source>
      {!area.whole && (
        <Source id="area" type="geojson" data={area.geometry}>
          <Layer id="area-fill" type="fill" paint={{ 'fill-color': '#f0f0fa', 'fill-opacity': 0.06 }} />
          {/* A dark casing under the white dashes keeps the outline readable over bright cells. Dash lengths are in line widths. */}
          <Layer id="area-casing" type="line" paint={{ 'line-color': '#000', 'line-width': 5, 'line-opacity': 0.7 }} />
          <Layer id="area-line" type="line" paint={{ 'line-color': '#fff', 'line-width': 2, 'line-dasharray': [3, 2] }} />
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
        <Marker longitude={calloutLeft ? box[0] : box[2]} latitude={box[3]} anchor={calloutLeft ? 'bottom-right' : 'bottom-left'}>
          <span className={calloutLeft ? 'callout is-left' : 'callout'}>
            <svg width="104" height="34" viewBox="0 0 104 34" aria-hidden="true">
              <path d={calloutLeft ? 'M104 34L70 0H0' : 'M0 34L34 0H104'} />
            </svg>
            <span>{area.short}</span>
          </span>
        </Marker>
      )}
    </Map>
  )
}
