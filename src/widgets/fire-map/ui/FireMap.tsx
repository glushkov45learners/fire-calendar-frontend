import type { Polygon } from 'geojson'
import { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Area } from '@/entities/aoi'
import type { GridCell } from '@/shared/api'
import { fmt } from '@/shared/lib/format'
import { gradient, SEQ } from '@/shared/lib/ramp'
import { ErrorBoundary } from '@/shared/ui/error-boundary'
import { cellLabel, heatCells } from '../lib/layers'

// The map engine is a separate chunk; title, legend and the rest of the page render without waiting for it.
const MapCanvas = lazy(() => import('./MapCanvas'))

/** Distance from the pointer to the tooltip, and the least it keeps from the map's edge. */
const TIP_OFFSET = 12
const TIP_MARGIN = 8

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
  const heat = useMemo(
    () => (grid.data && !grid.note ? heatCells(grid.data, area.whole ? null : area.geometry) : null),
    // area.id stands for the geometry: a point area is a new object on every render, the same id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid.data, grid.note, area.id],
  )
  const [hover, setHover] = useState<{ id: number; count: number; x: number; y: number } | null>(null)
  const mapEl = useRef<HTMLDivElement>(null)
  const tipEl = useRef<HTMLDivElement>(null)
  // The scene clips what leaves it, so near the right or bottom edge the tooltip flips to the other side of the pointer
  // instead of being cut off; it is placed before paint, once its size is known.
  useLayoutEffect(() => {
    const tip = tipEl.current
    const map = mapEl.current
    if (!hover || !tip || !map) return
    const room = (pointer: number, size: number, limit: number) => {
      const after = pointer + TIP_OFFSET
      const pos = after + size > limit - TIP_MARGIN ? pointer - TIP_OFFSET - size : after
      return Math.max(TIP_MARGIN, pos)
    }
    // Measured from the corner: the width of an absolutely placed box shrinks when it starts near the edge.
    tip.style.left = '0px'
    tip.style.top = '0px'
    tip.style.left = `${room(hover.x, tip.offsetWidth, map.clientWidth)}px`
    tip.style.top = `${room(hover.y, tip.offsetHeight, map.clientHeight)}px`
  }, [hover])
  const status = grid.note ?? grid.error ?? (grid.loading ? 'Loading the grid…' : null)

  return (
    <section className="scene" id="top" aria-label="Map">
      <div className="map" ref={mapEl}>
        <ErrorBoundary fallback={<p className="map-down">The map could not load. The calendar and charts below still work; reload to try the map again.</p>}>
          <Suspense fallback={null}>
            <MapCanvas area={area} cells={heat?.fc ?? null} onDraw={onDraw} onHover={setHover} />
          </Suspense>
        </ErrorBoundary>
        {hover && (
          <div className="tip" ref={tipEl} style={{ opacity: 1 }} aria-hidden="true">
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
          <span>{heat ? fmt(heat.min) : ''}</span>
          <span>{heat ? fmt(heat.max) : ''}</span>
        </div>
        {/* The ramp runs from the smallest to the largest cell of the selected area, so a colour means a different count in another area. */}
        {heat && <p className="map-scale">Colours are scaled to this area</p>}
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
