import { useMemo, useState } from 'react'
import { drawnArea } from '@/entities/aoi'
import { buildCells, type RecordKind } from '@/entities/analysis'
import { baselineLabel, scaleName, unitOf, useMeta } from '@/entities/meta'
import { effectiveMode } from '@/features/select-calendar-mode'
import { analyze, ApiError, describeError, getGrid, USE_MOCKS, type GridRecord } from '@/shared/api'
import { ANALYZE_DEBOUNCE_MS, SENSOR_START } from '@/shared/config'
import { daysInMonth, parsePeriod, periodLabel } from '@/shared/lib/format'
import { useAsync } from '@/shared/lib/use-async'
import { AppFooter, AppNav, SkipLink } from '@/widgets/app-shell'
import { BurnCalendar } from '@/widgets/burn-calendar'
import { ControlPanel } from '@/widgets/control-panel'
import { FireMap } from '@/widgets/fire-map'
import { MonthlyDigest } from '@/widgets/monthly-digest'
import { SelectionSummary } from '@/widgets/selection-summary'
import { SensorsChart } from '@/widgets/sensors-chart'
import { ThisMonth } from '@/widgets/this-month'
import { useView } from '../model/view'

const GRID_RECORD: Record<RecordKind, GridRecord> = { harm: 'harmonized', modis: 'modis', viirs: 'viirs' }
const GRID_UNIT: Record<RecordKind, string> = { harm: 'Harmonized detections', modis: 'MODIS detections', viirs: 'VIIRS S-NPP detections' }

export function HomePage() {
  const [collapsed, setCollapsed] = useState(false)
  const meta = useMeta()
  const view = useView(meta.data)
  const { area, range } = view

  // One /analyze per area or period: debounced, and the previous request is aborted.
  const analysis = useAsync(
    (signal) => (range ? analyze({ aoi: area.geometry, from: range.from, to: range.to }, signal) : null),
    [area.id, range?.from, range?.to],
    ANALYZE_DEBOUNCE_MS,
  )
  const result = analysis.data

  // The month chosen in the calendar; "This month" falls back to the current, incomplete one.
  const focus = view.month ?? result?.current_month.period ?? null

  // The map's grid: the whole period by default, only the chosen month once one is chosen.
  const gridRange = useMemo(() => {
    if (!meta.data || !range) return null
    if (!view.month) return range
    const { year, month } = parsePeriod(view.month)
    const first = `${view.month}-01`
    const last = `${view.month}-${String(daysInMonth(year, month)).padStart(2, '0')}`
    const from = first < meta.data.date_min ? meta.data.date_min : first
    const to = last > meta.data.date_max ? meta.data.date_max : last
    return from <= to ? { from, to } : null
  }, [view.month, range, meta.data])
  const viirsTooEarly = view.record === 'viirs' && !!gridRange && gridRange.to < `${SENSOR_START.viirs}-01`
  const grid = useAsync(
    (signal) => (gridRange && !viirsTooEarly ? getGrid({ ...gridRange, record: GRID_RECORD[view.record] }, signal) : null),
    [gridRange?.from, gridRange?.to, view.record, viirsTooEarly],
    ANALYZE_DEBOUNCE_MS,
  )
  const gridPeriod = view.month
    ? periodLabel(view.month)
    : gridRange
      ? `${periodLabel(gridRange.from.slice(0, 7), true)} – ${periodLabel(gridRange.to.slice(0, 7), true)}`
      : `${view.from} – ${view.to}`

  const cells = useMemo(
    () => (result && meta.data ? buildCells(result, meta.data, view.record, view.from, view.to) : []),
    [result, meta.data, view.record, view.from, view.to],
  )
  const withData = cells.filter((c) => c.value !== null)
  const dateLabel =
    withData.length > 0 ? `${periodLabel(withData[0].period, true)} to ${periodLabel(withData.at(-1)!.period, true)}` : `${view.from} to ${view.to}`
  const unit = meta.data ? unitOf(meta.data) : 'detections'
  const baseline = meta.data ? baselineLabel(meta.data) : '2001–2025'
  const error = meta.error ?? analysis.error

  return (
    <div className={collapsed ? 'shell is-collapsed' : 'shell'}>
      <SkipLink />
      <AppNav collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <ControlPanel
        area={area}
        onArea={view.setArea}
        years={view.years}
        onPeriod={view.setPeriod}
        record={view.record}
        onRecord={view.setRecord}
        mode={view.mode}
        onMode={view.setMode}
        scale={meta.data ? scaleName(meta.data) : 'one-scale'}
        range={range}
        summary={<SelectionSummary result={result} from={view.from} to={view.to} baseline={baseline} />}
        demo={USE_MOCKS}
      />

      <main className="stage">
        {error && (
          <div className="alert" role="alert">
            <span>{describeError(error)}</span>
            <button type="button" className="action" onClick={meta.error ? meta.retry : analysis.retry}>
              Retry
            </button>
          </div>
        )}
        <FireMap
          area={area}
          dateLabel={dateLabel}
          busy={analysis.loading && !!range}
          grid={{
            data: grid.data,
            loading: grid.loading && !!gridRange && !viirsTooEarly,
            // shortcut: GET /grid is not on the backend yet (to agree with Andriy); a 404 means "not deployed", not a broken request.
            error: grid.error instanceof ApiError && grid.error.status === 404 ? 'The map grid is not available on the server yet.' : grid.error ? describeError(grid.error) : null,
            unit: GRID_UNIT[view.record],
            period: gridPeriod,
            month: view.month ? periodLabel(view.month) : null,
            note: viirsTooEarly ? `VIIRS S-NPP starts in ${SENSOR_START.viirs.slice(0, 4)}` : null,
          }}
          onDraw={(p) => (p ? view.setArea(drawnArea(p)) : view.clearDrawn())}
        />
        <BurnCalendar
          cells={cells}
          from={view.from}
          to={view.to}
          mode={effectiveMode(view.mode, view.record)}
          record={view.record}
          unit={unit}
          baseline={baseline}
          selected={focus}
          onSelect={view.setMonth}
        />
        <ThisMonth result={result} meta={meta.data} chosen={view.month} from={view.from} to={view.to} unit={unit} onChoose={view.setMonth} />
        <SensorsChart rows={result?.monthly ?? null} meta={meta.data} />
        <MonthlyDigest />
        <AppFooter />
      </main>
    </div>
  )
}
