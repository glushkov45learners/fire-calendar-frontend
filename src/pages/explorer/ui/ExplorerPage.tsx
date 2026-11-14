import type { Polygon } from 'geojson'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { isSource, SOURCES, type CalendarCell, type Source } from '@/entities/hotspot'
import { DEFAULT_REGION, findRegion } from '@/entities/region'
import { ExportCsvButton } from '@/features/export-csv'
import { CoordinatesForm } from '@/features/select-area'
import { PeriodSelect } from '@/features/select-period'
import { CUSTOM_AREA, RegionPresetSelect } from '@/features/select-region-preset'
import { SourceToggle } from '@/features/switch-source'
import { getCalendar, getHotspots, USE_MOCKS } from '@/shared/api'
import { monthName } from '@/shared/lib/format'
import { useAsync } from '@/shared/lib/use-async'
import { AnomalyChart } from '@/widgets/anomaly-chart'
import { BurnCalendar, type Selection } from '@/widgets/burn-calendar'
import { FireMap } from '@/widgets/fire-map'
import { SiteHeader } from '@/widgets/site-header'
import { SummaryCards } from '@/widgets/summary-cards'

const FIRST_YEAR = 2000
const LAST_YEAR = new Date().getFullYear()

const clampYear = (v: string | null, fallback: number) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= FIRST_YEAR && n <= LAST_YEAR ? n : fallback
}

function parseSelection(v: string | null): Selection | null {
  const m = v?.match(/^(\d{4})-(\d{1,2})$/)
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null
}

const latest = (cells: CalendarCell[] | null): Selection | null => {
  const c = cells?.at(-1)
  return c ? { year: c.year, month: c.month } : null
}

export function ExplorerPage() {
  // Region, source, period and the chosen month live in the URL so a view can be shared as a link.
  const [params, setParams] = useSearchParams()
  const set = (patch: Record<string, string | null>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) p.delete(k)
          else p.set(k, v)
        }
        return p
      },
      { replace: true },
    )

  // shortcut: a drawn or typed area is kept in memory only, not in the URL; a reload returns to the preset.
  const [custom, setCustom] = useState<{ area: Polygon; drawn: boolean } | null>(null)
  const preset = findRegion(params.get('region')) ?? DEFAULT_REGION
  const area = custom?.area ?? preset.area
  const regionName = custom ? 'Custom area' : preset.name

  const source: Source = isSource(params.get('source')) ? (params.get('source') as Source) : 'harmonized'
  const sourceInfo = SOURCES.find((s) => s.id === source)!
  const to = clampYear(params.get('to'), LAST_YEAR)
  const from = Math.min(clampYear(params.get('from'), FIRST_YEAR), to)

  const calendar = useAsync(() => getCalendar({ area, source, from, to }), [area, source, from, to])
  const cells = calendar.loading ? null : calendar.data

  const asked = parseSelection(params.get('month'))
  const selected = asked && cells?.some((c) => c.year === asked.year && c.month === asked.month) ? asked : latest(cells)

  const hotspots = useAsync(
    () => (selected ? getHotspots({ area, source, ...selected }) : Promise.resolve([])),
    [area, source, selected?.year, selected?.month],
  )

  const period = `${from}-${to}`
  const lastCell = cells?.at(-1)

  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto grid max-w-[1600px] gap-(--gap-panel) p-4 sm:p-6">
        <h1 className="sr-only">Burn calendar explorer</h1>

        <section aria-label="Filters" className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <RegionPresetSelect
            value={custom ? CUSTOM_AREA : preset.id}
            onChange={(r) => {
              setCustom(null)
              set({ region: r.id, month: null })
            }}
          />
          <SourceToggle value={source} onChange={(s) => set({ source: s })} />
          <PeriodSelect
            from={from}
            to={to}
            min={FIRST_YEAR}
            max={LAST_YEAR}
            onChange={(f, t) => set({ from: String(f), to: String(t) })}
          />
          <span className="border-rule-2 text-ink-2 rounded-[4px] border px-2 py-1 text-xs">{sourceInfo.note}</span>
          {USE_MOCKS && <span className="text-ink-3 text-xs">Simulated data until the backend is connected</span>}
          <div className="ml-auto">
            <ExportCsvButton cells={cells} region={regionName} source={source} period={period} />
          </div>
        </section>

        <div className="panels grid gap-(--gap-panel) xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section aria-labelledby="where" className="panel grid grid-rows-[auto_minmax(22rem,1fr)_auto] gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="where" className="text-2xl">
                Where?
              </h2>
              <p className="text-ink-3 text-sm">{regionName}</p>
            </div>
            <div className="overflow-clip rounded-[calc(var(--radius-panel)-6px)]">
              <FireMap
                area={area}
                fit={!custom?.drawn}
                drawing={!!custom?.drawn}
                initialView={preset.view}
                hotspots={hotspots.data}
                month={selected}
                total={cells?.find((c) => c.year === selected?.year && c.month === selected?.month)?.count ?? null}
                loading={calendar.loading || hotspots.loading}
                error={hotspots.error}
                onDraw={(a) => {
                  setCustom(a ? { area: a, drawn: true } : null)
                  set({ month: null })
                }}
              />
            </div>
            <CoordinatesForm
              onSubmit={(a) => {
                setCustom({ area: a, drawn: false })
                set({ month: null })
              }}
            />
          </section>

          <section aria-labelledby="when" className="panel grid content-start gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="when" className="text-2xl">
                When?
              </h2>
              <p className="text-ink-3 text-sm">
                {lastCell
                  ? `Hotspots per month, through ${monthName(lastCell.month)} ${lastCell.year}`
                  : 'Hotspots per month'}
              </p>
            </div>
            <BurnCalendar
              cells={cells}
              from={from}
              to={to}
              loading={calendar.loading}
              error={calendar.error}
              onRetry={calendar.retry}
              selected={selected}
              onSelect={(s) => set({ month: `${s.year}-${s.month}` })}
              emptyHint={
                from < sourceInfo.since ? `${sourceInfo.label} observations start in ${sourceInfo.since}.` : undefined
              }
              emptyAction={
                to < sourceInfo.since
                  ? {
                      label: `Show ${sourceInfo.since} to ${LAST_YEAR}`,
                      onClick: () => set({ from: String(sourceInfo.since), to: String(LAST_YEAR), month: null }),
                    }
                  : undefined
              }
              gapLabel={`no ${sourceInfo.label} observations`}
            />
          </section>
        </div>

        {/* An empty period is said once, by the calendar; the anomaly and summary would only repeat it. */}
        {!(cells && !cells.length) && (
          <div className="panels grid gap-(--gap-panel) xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <section aria-label="Anomaly" className="panel">
              {calendar.loading ? (
                <div className="bg-paper-3 h-80 animate-pulse rounded-(--radius-panel)" />
              ) : (
                <AnomalyChart
                  yearCells={cells?.filter((c) => c.year === selected?.year) ?? []}
                  selected={selected}
                  baseline={`${sourceInfo.since} to ${LAST_YEAR}`}
                />
              )}
            </section>
            <section aria-label="Summary">
              <SummaryCards cells={cells} loading={calendar.loading} />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
