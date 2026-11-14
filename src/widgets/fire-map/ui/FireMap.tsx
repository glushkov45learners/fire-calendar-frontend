import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, Point, Polygon } from 'geojson'
import { useEffect, useMemo, useRef } from 'react'
import Map, { Layer, NavigationControl, Source, type MapRef } from 'react-map-gl/maplibre'
import { AGE_BUCKETS, ageBucket, type Hotspot } from '@/entities/hotspot'
import type { RegionView } from '@/entities/region'
import { DrawAreaControl } from '@/features/select-area'
import { bbox } from '@/shared/lib/geo'
import { fmt, monthName } from '@/shared/lib/format'
import { cssVar, usePrefersReducedMotion, useTheme } from '@/shared/lib/theme'

// Vite bundles maplibre-gl, which breaks its own import.meta.url lookup of the worker file.
// This instance is passed to <Map mapLib>, since react-map-gl would otherwise load a second copy.
maplibregl.setWorkerUrl(workerUrl)

type Props = {
  area: Polygon | null
  /** Fit the camera to `area` when it changes (presets, typed coordinates), not while drawing. */
  fit: boolean
  drawing: boolean
  initialView: RegionView
  hotspots: Hotspot[] | null
  month: { year: number; month: number } | null
  /** Hotspots the calendar counts for that month; the map may draw fewer. */
  total: number | null
  loading?: boolean
  error?: Error | null
  onDraw: (area: Polygon | null) => void
}

export function FireMap(p: Props) {
  const mapRef = useRef<MapRef>(null)
  const theme = useTheme()
  const reduced = usePrefersReducedMotion()
  // MapLibre paints on canvas and can't read var(); resolve the theme's tokens on each theme change.
  const colors = useMemo(
    () => ({ age: AGE_BUCKETS.map((b) => cssVar(`--age-${b.id}`)), line: cssVar('--map-line') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  )

  useEffect(() => {
    if (!p.fit || !p.area) return
    const [w, s, e, n] = bbox(p.area)
    mapRef.current?.fitBounds([w, s, e, n], { padding: 48, duration: reduced ? 0 : 800 })
  }, [p.area, p.fit, reduced])

  const reference = p.month ? new Date(Date.UTC(p.month.year, p.month.month, 1)) : new Date()
  const points = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      // Oldest first so the newest detections draw on top.
      features: (p.hotspots ?? [])
        .map((h) => ({ h, age: ageBucket(h.acquired, reference) }))
        .sort((a, b) => b.age - a.age)
        .map(({ h, age }) => ({
          type: 'Feature',
          properties: { age, frp: h.frp },
          geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
        })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.hotspots, reference.getTime()],
  )

  return (
    <div className="relative h-full min-h-80">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={p.initialView}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        style={{ width: '100%', height: '100%' }}
        attributionControl={{ compact: true }}
        // The panel can still be settling its grid size when the style loads; re-measure once.
        onLoad={(e) => e.target.resize()}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <DrawAreaControl onChange={p.onDraw} active={p.drawing} />
        {p.area && !p.drawing && (
          <Source id="area" type="geojson" data={p.area}>
            <Layer id="area-line" type="line" paint={{ 'line-color': colors.line, 'line-width': 1.5, 'line-dasharray': [2, 2] }} />
          </Source>
        )}
        <Source id="hotspots" type="geojson" data={points}>
          <Layer
            id="hotspots"
            type="circle"
            paint={{
              'circle-color': ['match', ['get', 'age'], 1, colors.age[0], 2, colors.age[1], 3, colors.age[2], colors.age[3]],
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2, 8, 3.5, 12, 6],
              'circle-opacity': 0.9,
            }}
          />
        </Source>
      </Map>

      <div className="bg-paper-2/90 border-rule absolute bottom-12 left-3 grid sm:bottom-3 gap-1.5 rounded-(--radius-panel) border p-3 text-xs">
        <p className="text-ink-2">
          {p.loading ? 'Loading hotspots' : p.error ? 'Hotspots did not load' : countLabel(p.hotspots?.length ?? 0, p.total)}
          {p.month && `, ${monthName(p.month.month)} ${p.month.year}`}
        </p>
        <ul className="grid gap-1" aria-label="Detection age at the end of the month">
          {AGE_BUCKETS.map((b) => (
            <li key={b.id} className="text-ink-3 flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: `var(--age-${b.id})` }} aria-hidden />
              {b.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Never print a capped point count on its own: it would contradict the calendar. */
function countLabel(shown: number, total: number | null) {
  return total !== null && shown < total ? `Showing ${fmt(shown)} of ${fmt(total)} hotspots` : `${fmt(shown)} hotspots`
}
