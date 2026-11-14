import { useRef, type KeyboardEvent } from 'react'
import type { CalendarCell } from '@/entities/hotspot'
import { cn } from '@/shared/lib/utils'
import { fmt, monthName, monthShort } from '@/shared/lib/format'
import { logBin, logBinEdges } from '@/shared/lib/stats'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { toRows } from '../lib/toRows'

const STEPS = 8
const MONTH_NUMS = Array.from({ length: 12 }, (_, i) => i + 1)

export type Selection = { year: number; month: number }

type Props = {
  cells: CalendarCell[] | null
  from: number
  to: number
  loading?: boolean
  error?: Error | null
  onRetry?: () => void
  selected?: Selection | null
  onSelect?: (s: Selection) => void
  /** Static picture for the splash screen: no totals, no tooltips, not focusable. */
  compact?: boolean
  emptyHint?: string
  /** One action that fills an empty period, e.g. jump to the years the sensor flew. */
  emptyAction?: { label: string; onClick: () => void }
  /** Said on the band that stands in for whole years without observations. */
  gapLabel?: string
}

const key = (y: number, m: number) => y * 12 + m

export function BurnCalendar(p: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const years = Array.from({ length: p.to - p.from + 1 }, (_, i) => p.to - i)
  const cells = new Map((p.cells ?? []).map((c) => [key(c.year, c.month), c]))
  const positive = (p.cells ?? []).map((c) => c.count).filter((n) => n > 0)
  const lo = Math.min(...positive, Infinity)
  const hi = Math.max(...positive, 0)
  const totals = new Map(years.map((y) => [y, MONTH_NUMS.reduce((a, m) => a + (cells.get(key(y, m))?.count ?? 0), 0)]))
  const observed = new Set((p.cells ?? []).map((c) => c.year))
  const rows = toRows(years, (y) => observed.has(y), !p.compact && !p.loading)

  if (p.error) {
    return (
      <div role="alert" className="grid min-h-64 place-content-center justify-items-start gap-3">
        <p>The calendar did not load: {p.error.message}</p>
        <Button variant="outline" onClick={p.onRetry}>
          Try again
        </Button>
      </div>
    )
  }
  if (!p.loading && p.cells && !p.cells.length) {
    return (
      <div className="grid min-h-64 place-content-center gap-1 text-center">
        <p>No observations in this period.</p>
        {p.emptyHint && <p className="text-ink-3 text-sm">{p.emptyHint}</p>}
        {p.emptyAction && (
          <Button variant="outline" className="mt-3 justify-self-center" onClick={p.emptyAction.onClick}>
            {p.emptyAction.label}
          </Button>
        )}
      </div>
    )
  }

  // One tab stop into the grid: the selected month, else the latest observed one.
  const latest = p.cells?.at(-1)
  const tabStop = p.selected && cells.has(key(p.selected.year, p.selected.month)) ? p.selected : latest
  const move = (e: KeyboardEvent) => {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 12, ArrowDown: -12 }[e.key]
    if (!d || !p.selected || !p.onSelect) return
    e.preventDefault()
    const k = key(p.selected.year, p.selected.month) - 1 + d
    const next = { year: Math.floor(k / 12), month: (k % 12) + 1 }
    if (!cells.has(key(next.year, next.month))) return
    p.onSelect(next)
    requestAnimationFrame(() =>
      gridRef.current?.querySelector<HTMLElement>(`[data-cell="${next.year}-${next.month}"]`)?.focus(),
    )
  }

  const yearRow = (y: number) => (
    <div key={y} role={p.compact ? undefined : 'row'} className="contents">
      <span
        role={p.compact ? undefined : 'rowheader'}
        className={cn('num text-ink-3 self-center', p.compact && 'leading-[8px]')}
      >
        {!p.compact || y % 5 === 0 ? y : ''}
      </span>
      {MONTH_NUMS.map((m) => {
        const c = cells.get(key(y, m))
        const bin = c ? logBin(c.count, lo, hi, STEPS) : -1
        const isSel = p.selected?.year === y && p.selected?.month === m
        const style = {
          height: p.compact ? '8px' : 'var(--cell-h)',
          background: p.loading
            ? 'var(--paper-3)'
            : bin > 0
              ? `var(--scale-${bin})`
              : bin === 0
                ? 'var(--paper-3)'
                : 'transparent',
        }
        const base = cn(
          p.compact ? 'rounded-[2px] min-w-0' : 'rounded-[min(var(--radius),4px)] min-w-0',
          p.loading && 'animate-pulse',
          !c && !p.loading && 'border border-dashed border-rule',
        )
        if (p.compact || !c || p.loading) return <span key={m} className={base} style={style} aria-hidden />
        const label = `${monthName(m)} ${y}: ${fmt(c.count)} hotspots, median ${fmt(c.median)}`
        return (
          <Tooltip key={m}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="gridcell"
                data-cell={`${y}-${m}`}
                aria-label={label}
                aria-selected={isSel}
                tabIndex={tabStop?.year === y && tabStop.month === m ? 0 : -1}
                onClick={() => p.onSelect?.({ year: y, month: m })}
                className={cn(
                  base,
                  'cursor-pointer outline-offset-1 transition-[outline-color] duration-(--dur-short)',
                  isSel ? 'outline-2 outline-ink' : 'hover:outline-1 hover:outline-ink-2',
                )}
                style={style}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="grid gap-0.5">
              <span className="font-medium">
                {monthName(m)} {y}
              </span>
              <span className="num">
                {fmt(c.count)} hotspots, median {fmt(c.median)}
              </span>
            </TooltipContent>
          </Tooltip>
        )
      })}
      {!p.compact && (
        <span role="gridcell" className="num text-ink-2 self-center text-right">
          {p.loading ? '' : fmt(totals.get(y) ?? 0)}
        </span>
      )}
    </div>
  )

  const cols = p.compact
    ? 'grid-cols-[2.75rem_repeat(12,minmax(0,1fr))]'
    : 'grid-cols-[2.75rem_repeat(12,minmax(0,1fr))_3.5rem] sm:grid-cols-[3.25rem_repeat(12,minmax(0,1fr))_4.5rem]'

  return (
    <div className="grid gap-4">
      <div
        ref={gridRef}
        role={p.compact ? 'img' : 'grid'}
        aria-label={p.compact ? `Burn calendar ${p.from} to ${p.to}, hotspots per month` : 'Burn calendar'}
        aria-busy={p.loading || undefined}
        onKeyDown={p.compact ? undefined : move}
        className={cn('grid text-xs', p.compact ? 'gap-[2px]' : 'gap-[3px]', cols)}
      >
        <div role={p.compact ? undefined : 'row'} className="contents">
          <span className="text-ink-3" role={p.compact ? undefined : 'columnheader'}>
            <span className="sr-only">Year</span>
          </span>
          {MONTH_NUMS.map((m) => (
            <span key={m} role={p.compact ? undefined : 'columnheader'} className="text-ink-3 text-center">
              <abbr title={monthName(m)} className="no-underline">
                {p.compact ? (
                  monthShort(m)[0]
                ) : (
                  <>
                    <span className="sm:hidden">{monthShort(m)[0]}</span>
                    <span className="max-sm:hidden">{monthShort(m)}</span>
                  </>
                )}
              </abbr>
            </span>
          ))}
          {!p.compact && (
            <span role="columnheader" className="text-ink-3 text-right">
              Total
            </span>
          )}
        </div>

        {rows.map((r) =>
          r.kind === 'gap' ? (
            <div key={`gap-${r.to}`} role="row" className="contents">
              <span
                role="gridcell"
                className="border-rule text-ink-3 col-span-full rounded-[min(var(--radius),4px)] border border-dashed px-3 py-1.5 text-center"
              >
                <span className="num">{r.from === r.to ? r.from : `${r.from} to ${r.to}`}</span>:{' '}
                {p.gapLabel ?? 'no observations'}
              </span>
            </div>
          ) : (
            yearRow(r.year)
          ),
        )}
      </div>
      {!p.compact && hi > 0 && <Legend lo={lo} hi={hi} />}
    </div>
  )
}

function Legend({ lo, hi }: { lo: number; hi: number }) {
  const edges = logBinEdges(lo, hi, STEPS)
  return (
    <figure className="flex flex-wrap items-end gap-x-5 gap-y-2 text-xs">
      <figcaption className="text-ink-3 w-full sm:w-auto">Hotspots per month</figcaption>
      <span className="flex items-center gap-1.5">
        <span className="border-rule h-3 w-5 rounded-[3px] border border-dashed" aria-hidden />
        <span className="text-ink-3">No data</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-paper-3 h-3 w-5 rounded-[3px]" aria-hidden />
        <span className="text-ink-3 num">0</span>
      </span>
      <span className="flex items-end gap-[3px]">
        {edges.map((e, i) => (
          <span key={i} className="grid gap-1">
            <span className="h-3 w-9 rounded-[3px]" style={{ background: `var(--scale-${i + 1})` }} aria-hidden />
            <span className="num text-ink-3">{fmt(e)}</span>
          </span>
        ))}
      </span>
    </figure>
  )
}
