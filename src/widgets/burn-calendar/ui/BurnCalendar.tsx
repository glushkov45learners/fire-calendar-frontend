import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { describeAnomaly, type Cell, type RecordKind } from '@/entities/analysis'
import type { CalendarMode } from '@/features/select-calendar-mode'
import { fmt, MONTHS_SHORT, periodLabel } from '@/shared/lib/format'
import { DIV, ramp, SEQ } from '@/shared/lib/ramp'

type Props = {
  cells: Cell[]
  from: number
  to: number
  /** Already resolved: 'anom' only reaches here for the harmonized record. */
  mode: CalendarMode
  record: RecordKind
  /** "VIIRS-equivalent detections", from /meta. */
  unit: string
  baseline: string
  selected: string | null
  onSelect: (period: string) => void
}

const W = 760
const L = 38
const T = 22
const GAP = 2
/** z beyond ±Z_RANGE takes the end colours of the diverging scale. */
const Z_RANGE = 3

/** Swatches in the key; odd, so the anomaly scale has a middle one for the norm. */
const KEY_STEPS = 7

const RAW_UNIT: Record<RecordKind, string> = { harm: '', modis: 'MODIS detections', viirs: 'VIIRS S-NPP detections' }

export function BurnCalendar({ cells, from, to, mode, record, unit, baseline, selected, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ cell: Cell; left: number; top: number } | null>(null)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // On phones the grid scrolls sideways; start at the latest years, which is what people look for first.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [from, to])

  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const byPeriod = new Map(cells.map((c) => [c.period, c]))
  const cw = (W - L) / years.length
  const ch = Math.min(24, Math.max(16, cw))
  const H = T + ch * 12
  const max = Math.max(1, ...cells.map((c) => c.value ?? 0))
  const label = record === 'harm' ? unit : RAW_UNIT[record]
  // Roving tab stop: the focused cell, else the chosen month, else the latest month with data.
  // A focused cell that the period no longer shows is forgotten, or Tab would find no cell at all.
  const focused = focusKey && +focusKey.slice(0, 4) >= from && +focusKey.slice(0, 4) <= to ? focusKey : null
  const tabStop = focused ?? (selected && byPeriod.has(selected) ? selected : cells.filter((c) => c.value !== null).at(-1)?.period ?? cells[0]?.period)

  const fill = (c: Cell) => {
    if (mode === 'anom') return ramp(DIV, 0.5 + Math.max(-1, Math.min(1, (c.row?.z ?? 0) / Z_RANGE)) / 2)
    const v = c.value ?? 0
    return v < 0.5 ? 'rgba(240,240,250,.07)' : ramp(SEQ, Math.log(v + 1) / Math.log(max + 1))
  }

  const showTip = (period: string) => {
    const el = svg.current?.querySelector<SVGRectElement>(`[data-p="${period}"]`)
    const cell = byPeriod.get(period)
    if (!el || !cell || !wrap.current) return setHover(null)
    const w = wrap.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const tw = tip.current?.offsetWidth ?? 220
    const th = tip.current?.offsetHeight ?? 80
    setHover({ cell, left: Math.max(0, Math.min(w.width - tw, r.left - w.left + r.width / 2 - tw / 2)), top: r.top - w.top - th - 8 })
  }

  const move = (period: string) => {
    setFocusKey(period)
    svg.current?.querySelector<SVGRectElement>(`[data-p="${period}"]`)?.focus()
    showTip(period)
  }

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const cur = tabStop && byPeriod.get(tabStop)
    if (!cur) return
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    if (step[e.key]) {
      e.preventDefault()
      const y = Math.min(to, Math.max(from, cur.year + step[e.key][0]))
      const m = Math.min(12, Math.max(1, cur.month + step[e.key][1]))
      move(`${y}-${String(m).padStart(2, '0')}`)
    } else if ((e.key === 'Enter' || e.key === ' ') && cur.row) {
      e.preventDefault()
      onSelect(cur.period)
    }
  }

  return (
    <section className="chapter" id="calendar" tabIndex={-1} aria-labelledby="calendar-h">
      <div className="cal-head">
        <div>
          <h2 id="calendar-h">Burning calendar</h2>
          <p>
            Each cell is one month. Read across a row to see a season return year after year; read down a column to see one year of burning.
            Choose a month to see where it burned on the map.
          </p>
        </div>
        <div className="cal-key">
          <span>{mode === 'count' ? `${label} per month, log scale` : `Against the ${baseline} norm for that month, z-score`}</span>
          {/* Swatches shaped like the cells, not a smooth bar: the map's key next to it is a bar, and the two scales differ. */}
          <div className="swatches" aria-hidden="true">
            {Array.from({ length: KEY_STEPS }, (_, i) => (
              <i key={i} style={{ background: ramp(mode === 'count' ? SEQ : DIV, i / (KEY_STEPS - 1)) }} />
            ))}
          </div>
          <div className="ramp-ends">
            <span>{mode === 'count' ? '1' : `−${Z_RANGE}`}</span>
            {mode === 'anom' && <span>0</span>}
            <span>{mode === 'count' ? fmt(max) : `+${Z_RANGE}`}</span>
          </div>
          <div className="nodata-key">
            <i aria-hidden="true" /> No data for this record
          </div>
        </div>
      </div>
      <div className="cal-wrap" ref={wrap}>
        {/* Month names sit outside the scroller, so on phones they stay put while the years scroll sideways. */}
        <svg className="cal cal-months" viewBox={`0 0 ${L} ${H}`} aria-hidden="true">
          {MONTHS_SHORT.map((name, m) => (
            <text key={name} x="0" y={T + m * ch + ch / 2 + 3}>
              {name}
            </text>
          ))}
        </svg>
        <div className="cal-scroll" ref={scroller} onScroll={() => setHover(null)}>
        <svg
          ref={svg}
          className="cal cal-grid"
          viewBox={`${L} 0 ${W - L} ${H}`}
          role="group"
          aria-label={`Calendar of ${label}, ${from} to ${to}. Arrow keys move between months, Enter chooses one.`}
          onKeyDown={onKey}
          onMouseMove={(e) => {
            const p = (e.target as Element).closest<SVGRectElement>('rect[data-p]')?.dataset.p
            if (p) showTip(p)
            else setHover(null)
          }}
          onMouseLeave={() => setHover(null)}
          onBlur={() => setHover(null)}
        >
          {years.map(
            (yr, i) =>
              (years.length <= 14 || i % 2 === 0 || yr === to) && (
                <text key={yr} x={L + i * cw + (cw - GAP) / 2} y="12" textAnchor="middle" aria-hidden="true">
                  {years.length > 20 ? `'${String(yr).slice(2)}` : yr}
                </text>
              ),
          )}
          {MONTHS_SHORT.map((name, m) => (
            <g key={name}>
              {years.map((yr, i) => {
                const period = `${yr}-${String(m + 1).padStart(2, '0')}`
                const c = byPeriod.get(period)
                const x = L + i * cw
                const y = T + m * ch
                const empty = !c || c.value === null
                const common = {
                  'data-p': period,
                  tabIndex: period === tabStop ? 0 : -1,
                  role: 'button',
                  'aria-label': c ? ariaLabel(c, label, record === 'harm') : periodLabel(period),
                  'aria-pressed': period === selected,
                  'aria-disabled': !c?.row || undefined,
                  onFocus: () => {
                    setFocusKey(period)
                    showTip(period)
                  },
                  onClick: () => c?.row && onSelect(period),
                }
                return empty ? (
                  <rect key={yr} {...common} className={period === selected ? 'c nd is-sel' : 'c nd'} x={x + 0.5} y={y + 0.5} width={cw - GAP - 1} height={ch - GAP - 1} />
                ) : (
                  <rect key={yr} {...common} className={period === selected ? 'c is-sel' : 'c'} x={x} y={y} width={cw - GAP} height={ch - GAP} fill={fill(c)} />
                )
              })}
            </g>
          ))}
        </svg>
        </div>
        <div className="tip" ref={tip} style={hover ? { left: hover.left, top: hover.top, opacity: 1 } : undefined} aria-hidden="true">
          {hover && <Tip cell={hover.cell} record={record} unit={unit} />}
        </div>
      </div>
    </section>
  )
}

function ariaLabel(c: Cell, unit: string, harmonized: boolean): string {
  if (c.value === null) return `${periodLabel(c.period)}: ${c.reason ?? 'no data'}`
  const anomaly = c.row && harmonized ? `, ${c.row.anomaly}` : ''
  return `${periodLabel(c.period)}: ${fmt(c.value)} ${unit}${anomaly}`
}

function Tip({ cell, record, unit }: { cell: Cell; record: RecordKind; unit: string }) {
  const r = cell.row
  if (cell.value === null || !r)
    return (
      <>
        <b>{periodLabel(cell.period, true)}</b>
        {cell.reason ?? 'No data'}
      </>
    )
  if (record !== 'harm')
    return (
      <>
        <b>{periodLabel(cell.period, true)}</b>
        MODIS {fmt(r.modis_raw)} · VIIRS S-NPP {fmt(r.viirs_raw)} raw
        <br />
        <small>Norm and anomaly: harmonized record only</small>
      </>
    )
  const d = describeAnomaly(r.count_h, r.median)
  return (
    <>
      <b>{periodLabel(cell.period, true)}</b>
      {fmt(r.count_h)} {unit}
      <br />
      Median {fmt(r.median)} · {d.figure} {d.unit}
      <br />
      {r.pct}th percentile · z {r.z.toFixed(1)} · <span className={`cls cls-${r.anomaly}`}>{r.anomaly}</span>
    </>
  )
}
