import type { ReactNode } from 'react'
import type { Area } from '@/entities/aoi'
import type { RecordKind } from '@/entities/analysis'
import { CalendarCsvButton } from '@/features/export-calendar-csv'
import { HotspotsCsvButton } from '@/features/export-hotspots-csv'
import { PointRadiusForm } from '@/features/point-radius'
import { SearchArea } from '@/features/search-area'
import { PresetTiles } from '@/features/select-area-preset'
import { ModeSwitch, type CalendarMode } from '@/features/select-calendar-mode'
import { PeriodSelect } from '@/features/select-period'
import { RecordSwitch } from '@/features/select-record'

type Props = {
  area: Area
  onArea: (a: Area) => void
  years: { from: number; to: number; min: number; max: number }
  onPeriod: (from: number, to: number) => void
  record: RecordKind
  onRecord: (k: RecordKind) => void
  mode: CalendarMode
  onMode: (m: CalendarMode) => void
  /** "VIIRS-equivalent", from /meta. */
  scale: string
  /** Exact dates sent to the API for the period. */
  range: { from: string; to: string } | null
  /** "In this selection", rendered by the page. */
  summary: ReactNode
  demo: boolean
}

/** The design's middle column: area, period, record, calendar mode, the selection's numbers and the downloads. */
export function ControlPanel(p: Props) {
  return (
    <section className="panel" aria-label="Area and record">
      <SearchArea onSelect={p.onArea} />

      <div className="group" style={{ marginTop: 8 }}>
        <h2>Area of interest</h2>
        <PresetTiles value={p.area} onSelect={p.onArea} />
        <details className="more">
          <summary>Point and radius</summary>
          <PointRadiusForm areaId={p.area.id} onSubmit={p.onArea} />
        </details>
        <p className="hint">Or draw a polygon on the map with the shape tool at its top right.</p>
      </div>

      <div className="group">
        <h2>Period</h2>
        <PeriodSelect {...p.years} onChange={p.onPeriod} />
      </div>

      <div className="group">
        <h2>Record</h2>
        <RecordSwitch value={p.record} scale={p.scale} onChange={p.onRecord} />
      </div>

      <div className="group">
        <h2>Calendar shows</h2>
        <ModeSwitch value={p.mode} record={p.record} onChange={p.onMode} />
      </div>

      <div className="group">
        <h2>In this selection</h2>
        {p.summary}
      </div>

      <div className="actions">
        <CalendarCsvButton area={p.area} from={p.range?.from ?? ''} to={p.range?.to ?? ''} disabled={!p.range} />
        <HotspotsCsvButton area={p.area} from={p.range?.from ?? ''} to={p.range?.to ?? ''} disabled={!p.range} />
      </div>
      <p className="hint">The hotspots CSV also lists NOAA-20 and NOAA-21 detections, so it has more rows than the raw count above.</p>
      {p.demo && <p className="hint">Demo data: real monthly counts for the four saved areas; other areas are scaled from the nearest one.</p>}
    </section>
  )
}
