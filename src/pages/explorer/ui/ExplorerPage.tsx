import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_REGION, findRegion, type Region } from '@/entities/region'
import { buildSeries, isSensor, unitOf, type Sensor } from '@/entities/sensor'
import { ExportActions } from '@/features/export-csv'
import { AreaSearch, AreaTiles } from '@/features/select-area'
import { PeriodSelect } from '@/features/select-period'
import { SensorSwitch } from '@/features/switch-sensor'
import { analyze, getMeta, USE_MOCKS } from '@/shared/api'
import { fmt, MONTHS, MONTHS_SHORT } from '@/shared/lib/format'
import { useAsync } from '@/shared/lib/use-async'
import { Segmented } from '@/shared/ui/segmented'
import { SpecList } from '@/shared/ui/spec-list'
import { AppSidebar } from '@/widgets/app-sidebar'
import { BurnCalendar, type CalendarMode } from '@/widgets/burn-calendar'
import { FireMap } from '@/widgets/fire-map'
import { MonthOutlook } from '@/widgets/month-outlook'
import { SensorChart } from '@/widgets/sensor-chart'
import { SiteFooter } from '@/widgets/site-footer'
import { summarize } from '../lib/summarize'

const MODES = [
  { id: 'count', label: 'Detections' },
  { id: 'anom', label: 'Anomaly' },
] as const satisfies readonly { id: CalendarMode; label: string }[]

// Before /meta answers, the year pickers span the archive's known start to this year.
const FALLBACK_MIN = 2000
const FALLBACK_MAX = new Date().getUTCFullYear()

const year = (v: string | null, lo: number, hi: number, fallback: number) => {
  const n = Number(v)
  return v && Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

export function ExplorerPage() {
  // Area, record, mode and period live in the URL, so a view can be shared as a link.
  const [params, setParams] = useSearchParams()
  const [collapsed, setCollapsed] = useState(false)
  const meta = useAsync(getMeta, [])

  const minY = meta.data ? +meta.data.date_min.slice(0, 4) : FALLBACK_MIN
  const maxY = meta.data ? +meta.data.date_max.slice(0, 4) : FALLBACK_MAX
  const region = findRegion(params.get('area')) ?? DEFAULT_REGION
  const sensor: Sensor = isSensor(params.get('sensor')) ? (params.get('sensor') as Sensor) : 'harm'
  const mode: CalendarMode = params.get('mode') === 'anom' ? 'anom' : 'count'
  const from = year(params.get('from'), minY, maxY, minY)
  const to = Math.max(from, year(params.get('to'), minY, maxY, maxY))

  // The API rejects dates outside the archive, so clip the whole-year range to it.
  const fromIso = meta.data && `${from}-01-01` < meta.data.date_min ? meta.data.date_min : `${from}-01-01`
  const toIso = meta.data && `${to}-12-31` > meta.data.date_max ? meta.data.date_max : `${to}-12-31`

  const set = (patch: Record<string, string>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(patch)) p.set(k, v)
        return p
      },
      { replace: true },
    )
  const selectRegion = (r: Region) => set({ area: r.id })

  // Monthly history is always complete in the response; the period only changes totals, so it is still sent as the contract asks.
  const result = useAsync(
    () => (meta.data ? analyze({ aoi: region.aoi, from: fromIso, to: toIso }) : new Promise<never>(() => {})),
    [meta.data, region.id, fromIso, toIso],
  )

  const series = useMemo(
    () => (result.data && meta.data ? buildSeries(result.data, meta.data, sensor) : null),
    [result.data, meta.data, sensor],
  )
  const inRange = useMemo(() => series?.cells.filter((c) => c.year >= from && c.year <= to) ?? [], [series, from, to])
  const summary = summarize(inRange)
  const withData = inRange.filter((c) => c.value !== null)
  const first = withData[0]
  const last = withData.at(-1)
  const dateLabel = first && last ? `${MONTHS_SHORT[first.month - 1]} ${first.year} to ${MONTHS_SHORT[last.month - 1]} ${last.year}` : `${from} to ${to}`
  const unit = meta.data ? unitOf(sensor, meta.data) : 'Detections'
  const error = meta.error ?? result.error
  const noData = 'No data'

  return (
    <div className={collapsed ? 'shell is-collapsed' : 'shell'}>
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <section className="panel" aria-label="Area and record">
        <AreaSearch coverage={meta.data?.coverage_bbox ?? null} onSelect={selectRegion} />

        <div className="group" style={{ marginTop: 8 }}>
          <h2>Area of interest</h2>
          <AreaTiles value={region} onSelect={selectRegion} />
        </div>

        <div className="group">
          <h2>Period</h2>
          <PeriodSelect from={from} to={to} min={minY} max={maxY} onChange={(f, t) => set({ from: String(f), to: String(t) })} />
        </div>

        <div className="group">
          <h2>Record</h2>
          <SensorSwitch value={sensor} meta={meta.data} onChange={(s) => set({ sensor: s })} />
        </div>

        <div className="group">
          <h2>Calendar shows</h2>
          <Segmented label="Calendar shows" value={mode} options={MODES} onChange={(m) => set({ mode: m })} />
        </div>

        <div className="group">
          <h2>In this selection</h2>
          <SpecList
            rows={[
              ['Detections', series ? fmt(summary.total) : '…'],
              ['Peak month of the year', summary.peakMonth ? MONTHS[summary.peakMonth - 1] : series ? noData : '…'],
              ['Most active year', summary.topYear ?? (series ? noData : '…')],
              ['Largest single month', summary.best ? `${MONTHS_SHORT[summary.best.month - 1]} ${summary.best.year}, ${fmt(summary.best.value)}` : series ? noData : '…'],
              ...(result.data ? ([['Grid cells in area', fmt(result.data.cells)]] as [string, string][]) : []),
            ]}
          />
        </div>

        <ExportActions region={region} from={fromIso} to={toIso} disabled={!meta.data} />
        {USE_MOCKS && <p className="hint">Demo data: real monthly counts for the four saved areas; other areas are scaled from the nearest one.</p>}
      </section>

      <main className="stage">
        {error && (
          <div className="alert" role="alert">
            <span>Could not load the record: {error.message}</span>
            <button type="button" className="action" onClick={meta.error ? meta.retry : result.retry}>
              Retry
            </button>
          </div>
        )}
        <FireMap region={region} dateLabel={dateLabel} />
        <BurnCalendar cells={inRange} from={from} to={to} mode={mode} unit={unit} />
        <MonthOutlook current={series?.current ?? null} cells={inRange} />
        <SensorChart rows={result.data?.monthly ?? null} meta={meta.data} />
        <SiteFooter />
      </main>
    </div>
  )
}
