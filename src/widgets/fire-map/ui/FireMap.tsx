import type { Polygon } from 'geojson'
import { lazy, Suspense, useMemo } from 'react'
import type { Area } from '@/entities/aoi'
import type { Hotspot } from '@/shared/api'
import { MAX_MAP_POINTS } from '@/shared/config'
import { fmt, periodLabel } from '@/shared/lib/format'
import { gradient, SEQ } from '@/shared/lib/ramp'
import { useAsync } from '@/shared/lib/use-async'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { AGE_STOPS, heatCells, pointLayer, type HeatGrid } from '../lib/layers'

// The map engine is a separate chunk; title, legend and the rest of the page render without waiting for it.
const MapCanvas = lazy(() => import('./MapCanvas'))

const loadGrid = (signal: AbortSignal) =>
  fetch('/data/grid.json', { signal }).then((r) => {
    if (!r.ok) throw new Error(`grid.json: HTTP ${r.status}`)
    return r.json() as Promise<HeatGrid>
  })

type Props = {
  area: Area
  dateLabel: string
  busy: boolean
  /** The month whose hotspots are drawn. */
  month: string | null
  points: { data: Hotspot[] | null; loading: boolean; error: string | null }
  onDraw: (polygon: Polygon | null) => void
}

export function FireMap({ area, dateLabel, busy, month, points, onDraw }: Props) {
  // shortcut: the heat layer is the mockup's static grid (public/data/grid.json); replace with the ETL file or an endpoint once the team picks one.
  // Fetched here, not in the lazy chunk, so it loads in parallel with the map engine.
  const grid = useAsync(loadGrid, [])
  const cells = useMemo(() => (grid.data ? heatCells(grid.data) : null), [grid.data])
  const dots = useMemo(() => (points.data ? pointLayer(points.data, MAX_MAP_POINTS) : null), [points.data])
  const shown = dots?.features.length ?? 0
  const total = points.data?.length ?? 0

  return (
    <section className="scene" id="top" aria-label="Map">
      <div className="map">
        <ErrorBoundary fallback={<p className="map-down">The map could not load. The calendar and charts below still work; reload to try the map again.</p>}>
          <Suspense fallback={null}>
            <MapCanvas area={area} cells={cells} dots={dots} onDraw={onDraw} />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div className="veil" />

      <div className="map-key">
        MODIS detections per 0.1° cell
        <div className="ramp" style={{ background: gradient(SEQ) }} />
        <div className="ramp-ends">
          <span>1</span>
          <span>{grid.data ? fmt(grid.data.gmax) : ''}</span>
        </div>
        {month && (
          <div className="points-key" aria-live="polite">
            {points.loading
              ? `Loading hotspots, ${periodLabel(month, true)}`
              : points.error
                ? points.error
                : `Showing ${fmt(shown)} of ${fmt(total)} hotspots, ${periodLabel(month, true)}`}
            <div className="ramp" style={{ background: gradient([...AGE_STOPS]) }} />
            <div className="ramp-ends">
              <span>Day 1</span>
              <span>Last day</span>
            </div>
          </div>
        )}
      </div>

      <div className="opening">
        <p className="date">
          {dateLabel}
          {busy && <span className="busy"> · updating</span>}
        </p>
        <h1>{area.name}</h1>
      </div>
    </section>
  )
}
