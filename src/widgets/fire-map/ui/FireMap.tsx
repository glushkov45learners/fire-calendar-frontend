import type { Polygon } from 'geojson'
import { lazy, Suspense, useMemo, useState } from 'react'
import type { Area } from '@/entities/aoi'
import type { GridCell } from '@/shared/api'
import { fmt } from '@/shared/lib/format'
import { gradient, SEQ } from '@/shared/lib/ramp'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { cellLabel, heatCells } from '../lib/layers'

// The map engine is a separate chunk; title, legend and the rest of the page render without waiting for it.
const MapCanvas = lazy(() => import('./MapCanvas'))

type Props = {
  area: Area
  dateLabel: string
  busy: boolean
  grid: {
    data: GridCell[] | null
    loading: boolean
    error: string | null
    /** "Harmonized detections", "MODIS detections"… */
    unit: string
    /** "Nov 2000 – Nov 2026" or "October 2026". */
    period: string
    /** Why the map is empty on purpose, e.g. VIIRS before 2012; the grid is not drawn then. */
    note: string | null
  }
  onDraw: (polygon: Polygon | null) => void
}

export function FireMap({ area, dateLabel, busy, grid, onDraw }: Props) {
  const heat = useMemo(() => (grid.data && !grid.note ? heatCells(grid.data) : null), [grid.data, grid.note])
  const [hover, setHover] = useState<{ id: number; count: number; x: number; y: number } | null>(null)
  const status = grid.note ?? grid.error ?? (grid.loading ? 'Loading the grid…' : null)

  return (
    <section className="scene" id="top" aria-label="Map">
      <div className="map">
        <ErrorBoundary fallback={<p className="map-down">The map could not load. The calendar and charts below still work; reload to try the map again.</p>}>
          <Suspense fallback={null}>
            <MapCanvas area={area} cells={heat?.fc ?? null} onDraw={onDraw} onHover={setHover} />
          </Suspense>
        </ErrorBoundary>
        {hover && (
          <div className="tip" style={{ left: hover.x + 12, top: hover.y + 12, opacity: 1 }} aria-hidden="true">
            <b>{cellLabel(hover.id)}</b>
            {fmt(hover.count)} {grid.unit.toLowerCase()}, {grid.period}
          </div>
        )}
      </div>
      <div className="veil" />

      <div className="map-key" aria-live="polite">
        {grid.unit} per 0.1° cell, {grid.period}
        <div className="ramp" style={{ background: gradient(SEQ) }} />
        <div className="ramp-ends">
          <span>1</span>
          <span>{heat ? fmt(heat.max) : ''}</span>
        </div>
        {status && <p className="map-note">{status}</p>}
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
