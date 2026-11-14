import { useRef, useState, type MouseEvent } from 'react'
import type { Cell } from '@/entities/sensor'
import { fmt, MONTHS_SHORT } from '@/shared/lib/format'
import { DIV, gradient, ramp, SEQ } from '@/shared/lib/ramp'

export type CalendarMode = 'count' | 'anom'

type Props = { cells: Cell[]; from: number; to: number; mode: CalendarMode; unit: string }

const W = 760
const L = 38
const T = 22
const GAP = 2

/** k× the norm, with +1 on both sides so empty months don't divide by zero. */
const ratio = (v: number, md: number) => (v + 1) / (md + 1)

export function BurnCalendar({ cells, from, to, mode, unit }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const tip = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ cell: Cell; left: number; top: number } | null>(null)

  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const byKey = new Map(cells.map((c) => [`${c.year}-${c.month}`, c]))
  const cw = (W - L) / years.length
  const ch = Math.min(24, Math.max(16, cw))
  const H = T + ch * 12
  const max = Math.max(1, ...cells.map((c) => c.value ?? 0))

  const fill = (c: Cell & { value: number }) =>
    mode === 'count'
      ? c.value < 0.5
        ? 'rgba(240,240,250,.07)'
        : ramp(SEQ, Math.log(c.value + 1) / Math.log(max + 1))
      : ramp(DIV, 0.5 + Math.log2(ratio(c.value, c.median)) / 8)

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const el = (e.target as Element).closest<SVGRectElement>('rect[data-k]')
    const cell = el && byKey.get(el.dataset.k!)
    if (!el || !cell || !wrap.current) return setHover(null)
    const w = wrap.current.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const tw = tip.current?.offsetWidth ?? 180
    const th = tip.current?.offsetHeight ?? 60
    setHover({
      cell,
      left: Math.max(0, Math.min(w.width - tw, r.left - w.left + r.width / 2 - tw / 2)),
      top: r.top - w.top - th - 8,
    })
  }

  return (
    <section className="chapter" id="calendar">
      <div className="cal-head">
        <div>
          <h2>Burning calendar</h2>
          <p>Each cell is one month. Read across a row to see a season return year after year; read down a column to see one year of burning.</p>
        </div>
        <div className="cal-key">
          <span>{mode === 'count' ? `${unit} per month, log scale` : 'Against the median for that month'}</span>
          <div className="ramp" style={{ background: gradient(mode === 'count' ? SEQ : DIV) }} />
          <div className="ramp-ends">
            <span>{mode === 'count' ? '1' : '1/16×'}</span>
            <span>{mode === 'count' ? fmt(max) : '16×'}</span>
          </div>
        </div>
      </div>
      <div className="cal-wrap" ref={wrap}>
        <svg className="cal" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Month by year grid of ${unit}, ${from} to ${to}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {years.map(
            (yr, i) =>
              (years.length <= 14 || i % 2 === 0 || yr === to) && (
                <text key={yr} x={L + i * cw + (cw - GAP) / 2} y="12" textAnchor="middle">
                  {years.length > 20 ? `'${String(yr).slice(2)}` : yr}
                </text>
              ),
          )}
          {MONTHS_SHORT.map((name, m) => (
            <g key={name}>
              <text x="0" y={T + m * ch + ch / 2 + 3}>
                {name}
              </text>
              {years.map((yr, i) => {
                const c = byKey.get(`${yr}-${m + 1}`)
                const x = L + i * cw
                const y = T + m * ch
                if (!c || c.value === null)
                  return <rect key={yr} x={x + 0.5} y={y + 0.5} width={cw - GAP - 1} height={ch - GAP - 1} fill="none" stroke="rgba(240,240,250,.12)" strokeDasharray="2 3" />
                return <rect key={yr} className="c" x={x} y={y} width={cw - GAP} height={ch - GAP} fill={fill(c as Cell & { value: number })} data-k={`${yr}-${m + 1}`} />
              })}
            </g>
          ))}
        </svg>
        <div className="tip" ref={tip} style={hover ? { left: hover.left, top: hover.top, opacity: 1 } : undefined} aria-hidden="true">
          {hover && <Tip cell={hover.cell} />}
        </div>
      </div>
    </section>
  )
}

function Tip({ cell }: { cell: Cell }) {
  const v = cell.value ?? 0
  const k = ratio(v, cell.median)
  return (
    <>
      <b>
        {MONTHS_SHORT[cell.month - 1]} {cell.year}
      </b>
      {fmt(v)} detections
      <br />
      {k >= 1 ? `${k.toFixed(1)}× the median` : `${(k * 100).toFixed(0)}% of the median`} ({fmt(cell.median)})
      {cell.anomaly && (
        <>
          <br />
          {cell.pct}th percentile, {cell.anomaly}
        </>
      )}
    </>
  )
}
