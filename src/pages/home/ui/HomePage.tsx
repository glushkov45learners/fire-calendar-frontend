import { useMemo, useState } from 'react'
import { drawnArea } from '@/entities/aoi'
import { buildCells } from '@/entities/analysis'
import { baselineLabel, scaleName, unitOf, useMeta } from '@/entities/meta'
import { effectiveMode } from '@/features/select-calendar-mode'
import { analyze, describeError, getHotspots, USE_MOCKS } from '@/shared/api'
import { ANALYZE_DEBOUNCE_MS } from '@/shared/config'
import { daysInMonth, parsePeriod, periodLabel } from '@/shared/lib/format'
import { useAsync } from '@/shared/lib/use-async'
import { AppFooter, AppNav, SkipLink } from '@/widgets/app-shell'
import { BurnCalendar } from '@/widgets/burn-calendar'
import { ControlPanel } from '@/widgets/control-panel'
import { FireMap } from '@/widgets/fire-map'
import { SelectionSummary } from '@/widgets/selection-summary'
import { SensorsChart } from '@/widgets/sensors-chart'
import { ThisMonth } from '@/widgets/this-month'
import { useView } from '../model/view'

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

  // The month on the map and in "This month": the chosen one, else the current, incomplete month.
  const focus = view.month ?? result?.current_month.period ?? null
  const monthRange = useMemo(() => {
    if (!focus || !meta.data) return null
    const { year, month } = parsePeriod(focus)
    const first = `${focus}-01`
    const last = `${focus}-${String(daysInMonth(year, month)).padStart(2, '0')}`
    const from = first < meta.data.date_min ? meta.data.date_min : first
    const to = last > meta.data.date_max ? meta.data.date_max : last
    return from <= to ? { from, to } : null
  }, [focus, meta.data])
  const hotspots = useAsync(
    (signal) => (monthRange ? getHotspots({ aoi: area.geometry, ...monthRange }, signal) : null),
    [area.id, monthRange?.from, monthRange?.to],
    ANALYZE_DEBOUNCE_MS,
  )

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
          month={focus}
          points={{ data: hotspots.data, loading: hotspots.loading && !!monthRange, error: hotspots.error ? describeError(hotspots.error) : null }}
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
        <AppFooter />
      </main>
    </div>
  )
}
