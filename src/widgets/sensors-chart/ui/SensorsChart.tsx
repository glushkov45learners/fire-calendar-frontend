import type { ReactNode } from 'react'
import { recordValue, type RecordKind } from '@/entities/analysis'
import { scaleName } from '@/entities/meta'
import type { Meta, MonthlyRow } from '@/shared/api'
import { AQUA_JOINS_YEAR, VIIRS_START_YEAR } from '@/shared/config'
import { fmt } from '@/shared/lib/format'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { SpecList } from '@/shared/ui/spec-list'

type Props = { rows: MonthlyRow[] | null; meta: Meta | null }

/** The chart's own units. Phones get a narrower box, so the same 11-unit labels come out about twice as large on screen. */
/** R is the room on the right for end labels, LINE the vertical room one label needs (phone text renders larger). */
const WIDE = { W: 760, H: 240, R: 80, LINE: 18 }
const NARROW = { W: 400, H: 250, R: 80, LINE: 20 }
const L = 4
/** Baseline of the first marker label, in the band above the plot; CHAR is one label character's width. */
const MARK_ROW = 12
const CHAR = 7
const B = 28
/** Year ticks closer than this to an already placed one are dropped. */
const TICK_GAP = 3

const STYLE: Record<RecordKind, { label: string; stroke: string; width: number; dash?: string; hi?: boolean }> = {
  harm: { label: 'Harmonized', stroke: '#fff', width: 2, hi: true },
  modis: { label: 'MODIS raw', stroke: 'rgba(240,240,250,.5)', width: 1 },
  // Equals the harmonized line from 2012 on, so it is drawn as a wide band under it and shows as a grey edge.
  viirs: { label: 'VIIRS raw', stroke: 'rgba(240,240,250,.4)', width: 6 },
}

/** Yearly totals over the baseline years: the raw sensors' steps, and the harmonized line that removes them. */
export function SensorsChart({ rows, meta }: Props) {
  const { W, H, R, LINE } = useMediaQuery('(max-width: 720px)') ? NARROW : WIDE
  if (!rows || !meta) return <Frame copy="Loading the record…" />
  const [b0, b1] = meta.baseline_years
  const years = Array.from({ length: b1 - b0 + 1 }, (_, i) => b0 + i)
  const byYear = new Map<number, MonthlyRow[]>()
  for (const r of rows) {
    const y = +r.period.slice(0, 4)
    if (y >= b0 && y <= b1) byYear.set(y, [...(byYear.get(y) ?? []), r])
  }
  const total = (k: RecordKind, y: number) => (k === 'viirs' && y < VIIRS_START_YEAR ? null : (byYear.get(y) ?? []).reduce((a, r) => a + recordValue(r, k), 0))
  const series = (['modis', 'viirs', 'harm'] as const).map((k) => ({ k, values: years.map((y) => total(k, y)) }))
  const overlap = rows.filter((r) => +r.period.slice(0, 4) >= VIIRS_START_YEAR && +r.period.slice(0, 4) <= b1)
  const k = overlap.reduce((a, r) => a + r.viirs_raw, 0) / Math.max(1, overlap.reduce((a, r) => a + r.modis_raw, 0))

  const max = Math.max(1, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)))
  const X = (i: number) => L + (i / (years.length - 1)) * (W - L - R)
  // The marker labels sit in a band above the plot, so no line can run through them. They share one row unless they would touch.
  const marks = [
    { year: AQUA_JOINS_YEAR, label: 'Aqua joins Terra' },
    { year: VIIRS_START_YEAR, label: 'VIIRS S-NPP begins' },
  ]
  const touch = X(marks[0].year - b0) + 6 + marks[0].label.length * CHAR + 10 > X(marks[1].year - b0) + 6
  const markRow = (i: number) => MARK_ROW + (touch ? LINE * i : 0)
  const T = markRow(marks.length - 1) + 12
  const Y = (v: number) => T + (1 - v / max) * (H - T - B)
  const path = (a: (number | null)[]) => a.map((v, i) => (v === null ? '' : `${i === 0 || a[i - 1] === null ? 'M' : 'L'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)).join('')
  // End labels: pushed apart downwards, then back up from the axis, so they neither overlap nor leave the plot.
  const ends = series.map((s) => ({ k: s.k, y: Y(s.values.at(-1) ?? 0) + 4 })).sort((a, b) => a.y - b.y)
  ends.forEach((e, i) => i && (e.y = Math.max(e.y, ends[i - 1].y + LINE)))
  for (let i = ends.length - 1, floor = H - B - 4; i >= 0; i--, floor -= LINE) ends[i].y = Math.min(ends[i].y, floor)
  // The sensor years and the last year always get a tick; the first year and the midpoint only where there is room.
  const ticks = [AQUA_JOINS_YEAR, VIIRS_START_YEAR, b1]
  for (const y of [b0, Math.round((VIIRS_START_YEAR + b1) / 2)]) if (ticks.every((t) => Math.abs(t - y) >= TICK_GAP)) ticks.push(y)
  const m = meta.model
  const scale = scaleName(meta)
  const span = (ys: number[]) => (ys.length ? `${ys[0]}–${ys.at(-1)}` : 'n/a')

  return (
    <Frame
      copy={
        <>
          MODIS: Terra since Nov 2000, Aqua since {AQUA_JOINS_YEAR}, 1 km. VIIRS S-NPP: since {VIIRS_START_YEAR}, 375 m, and{' '}
          <strong>{k.toFixed(1)} detections per MODIS detection</strong> over this area. The raw archives step up in {AQUA_JOINS_YEAR} and{' '}
          {VIIRS_START_YEAR} with no change in fires. The harmonized record restates all {b1 - b0 + 1} years in {scale} detections.
        </>
      }
      notes={
        <>
          <p className="hint">Reference: VIIRS S-NPP only. NOAA-20 (2018) and NOAA-21 (2023) are left out: they would add new steps.</p>
          <p className="hint">
            Industrial sources (FIRMS type 2 and 3: plants, gas flares, offshore) are excluded from the harmonized series; the raw hotspots CSV
            keeps them.
          </p>
        </>
      }
      spec={[
        ['Model', m.model_version],
        ['Scale', scale],
        ['Fitted on', span(m.fit_years)],
        ['Checked on', span(m.holdout_years)],
        ['Error (MAPE)', `${(m.metrics.mape * 100).toFixed(0)}%`],
        ['R²', m.metrics.r2.toFixed(2)],
        ['Bias', `${m.metrics.bias > 0 ? '+' : ''}${(m.metrics.bias * 100).toFixed(1)}%`],
      ]}
      chart={
        <svg className="lines" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Detections per year, ${b0}–${b1}: MODIS raw, VIIRS S-NPP raw and harmonized`}>
          <path d={`M${L} ${H - B + 0.5}H${W - R}`} stroke="rgba(240,240,250,.3)" />
          {ticks.map((y) => (
            <text key={y} x={X(y - b0)} y={H - 8} textAnchor={y === b0 ? 'start' : y === b1 ? 'end' : 'middle'}>
              {y}
            </text>
          ))}
          {marks.map((mk, i) => (
            <g key={mk.year}>
              <path d={`M${X(mk.year - b0)} ${markRow(i) - 10}V${H - B}`} stroke="rgba(240,240,250,.4)" strokeDasharray="2 4" />
              <text x={X(mk.year - b0) + 6} y={markRow(i)}>
                {mk.label}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <path key={s.k} d={path(s.values)} fill="none" stroke={STYLE[s.k].stroke} strokeWidth={STYLE[s.k].width} strokeDasharray={STYLE[s.k].dash} strokeLinejoin="round" />
          ))}
          {ends.map((e) => (
            <text key={e.k} className={STYLE[e.k].hi ? 'hi' : undefined} x={W} y={e.y} textAnchor="end">
              {STYLE[e.k].label}
            </text>
          ))}
          {/* The top of the plot is the largest yearly total: a faint rule with its value above the right end. */}
          <path d={`M${L} ${T + 0.5}H${W - R}`} stroke="rgba(240,240,250,.14)" />
          <text className="axis" x={W - R} y={T - 4} textAnchor="end">
            <tspan>{fmt(max)}</tspan> detections
          </text>
        </svg>
      }
    />
  )
}

type FrameProps = { copy: ReactNode; notes?: ReactNode; spec?: [string, string][]; chart?: ReactNode }

function Frame({ copy, notes, spec, chart }: FrameProps) {
  return (
    <section className="chapter" id="sensors" aria-labelledby="sensors-h">
      <div className="split">
        <div>
          <h2 id="sensors-h">Two sensors, one record</h2>
          <p>{copy}</p>
          {notes}
        </div>
        <div className="spec-col">{spec && <SpecList rows={spec} />}</div>
        {chart}
      </div>
    </section>
  )
}
