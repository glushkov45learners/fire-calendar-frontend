import type { ReactNode } from 'react'
import { describeAnomaly, spansAtMost } from '@/entities/analysis'
import { MonthStepper } from '@/features/select-month'
import type { AnalyzeResult, DailyRow, Meta } from '@/shared/api'
import { DAILY_MAX_YEARS, SMALL_MEDIAN } from '@/shared/config'
import { daysInMonth, fmt, MONTHS, MONTHS_SHORT, parsePeriod, periodLabel } from '@/shared/lib/format'
import { SpecList } from '@/shared/ui/spec-list'

type Props = {
  result: AnalyzeResult | null
  meta: Meta | null
  /** Chosen month, or null for the current one. */
  chosen: string | null
  from: number
  to: number
  unit: string
  onChoose: (period: string | null) => void
}

/** A month of the harmonized record against its norm: the current, incomplete month by default, or one chosen in the calendar. */
export function ThisMonth({ result, meta, chosen, from, to, unit, onChoose }: Props) {
  if (!result || !meta) return <Frame title="Month" copy="Loading the record…" />

  const cur = result.current_month
  const period = chosen ?? cur.period
  const isCurrent = period === cur.period
  const row = result.monthly.find((r) => r.period === period)
  if (!row && !isCurrent) return <Frame title={periodLabel(period)} copy="This month is outside the archive." />

  const { year, month } = parsePeriod(period)
  const name = MONTHS[month - 1]
  const count = isCurrent ? cur.count_h : row!.count_h
  const median = isCurrent ? cur.median : row!.median
  const pct = isCurrent ? cur.pct : row!.pct
  const anomaly = isCurrent ? cur.anomaly : row!.anomaly
  const ratio = isCurrent ? cur.ratio : median ? count / median : null
  const d = describeAnomaly(count, median)
  const dim = daysInMonth(year, month)
  const baseline = `${meta.baseline_years[0]}–${meta.baseline_years[1]}`

  // The same calendar month in every complete year of the period, harmonized.
  const hist = result.monthly.filter(
    (r) => +r.period.slice(5, 7) === month && +r.period.slice(0, 4) >= from && +r.period.slice(0, 4) <= to && r.period !== period && r.period < cur.period && r.period >= meta.date_min.slice(0, 7),
  )
  const rank = hist.filter((r) => r.count_h > count).length + 1
  const season = result.seasonality.find((s) => s.month === month)
  // The strongest other year of this month in the period, for the sentence under the title.
  const top = hist.reduce<{ year: number; v: number } | null>((a, r) => (!a || r.count_h > a.v ? { year: +r.period.slice(0, 4), v: r.count_h } : a), null)

  return (
    <Frame
      title={periodLabel(period)}
      // Stepping stays inside the selected period (and the archive): from=to=2026 means Jan–Nov 2026, nothing earlier.
      stepper={<MonthStepper value={period} min={maxStr(meta.date_min.slice(0, 7), `${from}-01`)} max={minStr(cur.period, `${to}-12`)} current={cur.period} onChange={onChoose} />}
      copy={
        <>
          {top
            ? rank === 1
              ? `The highest ${name} in ${from}–${to}; the next is ${top.year} with ${fmt(top.v)} ${unit}.`
              : `Ranks ${rank} of ${hist.length + 1} among the ${name}s of ${from}–${to}; the highest is ${top.year} with ${fmt(top.v)} ${unit}.`
            : `No other ${name} in ${from}–${to} to compare with.`}
          {d.note && <span className="note"> {d.note}</span>}
        </>
      }
      spec={[
        ['Detections', fmt(count)],
        [`Median ${baseline}`, fmt(median)],
        ...(season ? ([['Usual range (P25–P75)', `${fmt(season.p25)}–${fmt(season.p75)}`]] as [string, ReactNode][]) : []),
        median < SMALL_MEDIAN ? ['Difference', `${d.figure} detections`] : ['Ratio to median', ratio === null ? 'n/a' : `${ratio.toFixed(1)}×`],
        ['Percentile', String(pct)],
        ['Class', <span key="cls" className={`cls cls-${anomaly}`}>{anomaly}</span>],
        ...(isCurrent ? ([['Observed', `${cur.days_observed} of ${dim} days`]] as [string, ReactNode][]) : []),
      ]}
      extra={
        <>
          {isCurrent && (
            <p className="hint">
              {cur.days_observed} of {dim} days observed: the month is not over, so its total will still grow, while the median is for whole months.
            </p>
          )}
          <Strip hist={hist.map((r) => ({ year: +r.period.slice(0, 4), v: r.count_h }))} count={count} median={median} band={season && [season.p25, season.p75]} label={`${MONTHS_SHORT[month - 1]} ${year}`} name={name} />
          <Daily
            days={result.daily.filter((x) => x.date.startsWith(period))}
            allowed={spansAtMost(from, to, DAILY_MAX_YEARS)}
            inPeriod={year >= from && year <= to}
            dim={isCurrent ? cur.days_observed : dim}
            label={periodLabel(period)}
          />
        </>
      }
    />
  )
}

const maxStr = (a: string, b: string) => (a > b ? a : b)
const minStr = (a: string, b: string) => (a < b ? a : b)

type StripProps = { hist: { year: number; v: number }[]; count: number; median: number; band?: [number, number]; label: string; name: string }

/** The month in every year as ticks on a log axis, with the median, the p25–p75 corridor and this month marked (design: "strip"). */
function Strip({ hist, count, median, band, label, name }: StripProps) {
  const hi = Math.max(count, median, band?.[1] ?? 0, ...hist.map((o) => o.v), 1)
  const X = (v: number) => 4 + (Math.log(v + 1) / Math.log(hi + 1)) * 752
  const xm = X(median)
  const xc = X(count)
  const anchor = (x: number) => (x > 660 ? 'end' : 'start')
  const off = (x: number) => (x > 660 ? -6 : 6)
  // The "usual range" caption shares a row with the month's name (7 units a letter). It goes to the right of the range, else to the
  // left; a range collapsed to one value carries that value in the caption, as no box shows it.
  const nameW = label.length * 7
  const nameFrom = xc > 660 ? xc - 6 - nameW : xc + 6
  const capText = band ? (band[0] === band[1] ? `usual range ${fmt(band[0])}` : 'usual range') : ''
  const capW = capText.length * 7
  const meetsName = (from: number) => from < nameFrom + nameW + 8 && from + capW > nameFrom - 8
  const capRight = band ? X(band[1]) + 6 : 0
  const capLeft = band ? X(band[0]) - 6 - capW : 0
  // With no room on either side it drops to the axis's bottom row, centred under the range and kept clear of the "0" and the maximum.
  const hiW = fmt(hi).length * 7
  const capMid = band ? (X(band[0]) + X(band[1])) / 2 : 0
  const caption: { x: number; y: number; anchor: 'start' | 'end' } | null = !band
    ? null
    : capRight + capW <= 758 && !meetsName(capRight)
      ? { x: capRight, y: 34, anchor: 'start' }
      : capLeft >= 0 && !meetsName(capLeft)
        ? { x: capLeft + capW, y: 34, anchor: 'end' }
        : { x: Math.max(16, Math.min(capMid - capW / 2, 760 - hiW - 10 - capW)), y: 80, anchor: 'start' }
  // A range narrower than 6 units (p25 = p75, or nearly) is widened around its middle so it stays visible beside the month's point.
  const bandW = band ? Math.max(6, X(band[1]) - X(band[0])) : 0
  const bandX = Math.max(0, capMid - bandW / 2)
  // The numbers behind the marks, under the axis: the median first, then the ends of the usual range; one that would touch a kept
  // number, this month's stem or the axis's own "0" is left out.
  const values: { key: string; x: number; text: string }[] = []
  for (const [key, v] of [['m', median], ['p25', band?.[0]], ['p75', band?.[1]]] as const) {
    if (v === undefined) continue
    const x = X(v)
    if (x > 30 && Math.abs(x - xc) > 22 && values.every((o) => Math.abs(o.x - x) > 24)) values.push({ key, x, text: fmt(v) })
  }
  return (
    <svg className="strip" viewBox="0 0 760 86" role="img" aria-label={`${name} in every year of the period, with the median, the middle half of years and ${label} marked`}>
      {band && <rect x={bandX} y="38" width={bandW} height="13" fill="rgba(240,240,250,.12)" />}
      <path d="M0 50.5H760" stroke="rgba(240,240,250,.3)" />
      {hist.map((o) => (
        <path key={o.year} d={`M${X(o.v)} 42V50`} stroke="rgba(240,240,250,.55)">
          <title>
            {o.year}: {fmt(o.v)}
          </title>
        </path>
      ))}
      <path d={`M${xm} 22V50`} stroke="#fff" />
      <text className="hi" x={xm + off(xm)} y="20" textAnchor={anchor(xm)}>
        Median
      </text>
      {caption && (
        <text x={caption.x} y={caption.y} textAnchor={caption.anchor}>
          {capText}
        </text>
      )}
      {values.map((v) => (
        <text key={v.key} x={v.x} y="67" textAnchor={v.x < 14 ? 'start' : v.x > 746 ? 'end' : 'middle'}>
          {v.text}
        </text>
      ))}
      <circle cx={xc} cy="50.5" r="4.5" fill="#fff" />
      <path d={`M${xc} 46V40`} stroke="#fff" />
      {/* The name sits above its point; the black edge keeps a line behind it (the median's) from running through the letters. */}
      <text className="hi" x={xc + off(xc)} y="34" textAnchor={anchor(xc)} stroke="#000" strokeWidth="4" paintOrder="stroke">
        {label}
      </text>
      <text x="0" y="80">
        0
      </text>
      <text x="760" y="80" textAnchor="end">
        {fmt(hi)}
      </text>
    </svg>
  )
}

type DailyProps = { days: DailyRow[]; allowed: boolean; inPeriod: boolean; dim: number; label: string }

function Daily({ days, allowed, inPeriod, dim, label }: DailyProps) {
  if (!allowed) return <p className="hint daily-note">Narrow the period to 3 years to see days.</p>
  if (!inPeriod) return <p className="hint daily-note">This month is outside the selected period, so its days are not loaded.</p>
  if (!days.length) return <p className="hint daily-note">No daily data for {label}.</p>
  const W = 760
  const H = 120
  const B = 18
  // T is the top of the plot: the largest day reaches it, and the value is written above its right end.
  const T = 16
  const max = Math.max(1, ...days.map((d) => d.count_h))
  const bw = W / dim
  return (
    <svg className="daily" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Detections per day, ${label}`}>
      <path d={`M0 ${T + 0.5}H${W}`} stroke="rgba(240,240,250,.14)" />
      <text className="axis" x={W} y={T - 4} textAnchor="end">
        <tspan>{fmt(max)}</tspan> detections
      </text>
      {days.map((d) => {
        const i = +d.date.slice(8) - 1
        const h = (d.count_h / max) * (H - B - T)
        return (
          <rect key={d.date} x={i * bw + 1} y={H - B - h} width={Math.max(1, bw - 2)} height={h} fill="#f0f0fa">
            <title>
              {d.date}: {fmt(d.count_h)}
            </title>
          </rect>
        )
      })}
      <path d={`M0 ${H - B + 0.5}H${W}`} stroke="rgba(240,240,250,.3)" />
      {[1, 10, 20, dim].map((day) => (
        <text key={day} x={(day - 0.5) * bw} y={H - 4} textAnchor="middle">
          {day}
        </text>
      ))}
    </svg>
  )
}

type FrameProps = { title: string; copy: ReactNode; stepper?: ReactNode; spec?: [string, ReactNode][]; extra?: ReactNode }

function Frame({ title, copy, stepper, spec, extra }: FrameProps) {
  return (
    <section className="chapter" id="month" aria-labelledby="month-h">
      <div className="split">
        <div>
          <h2 id="month-h">{title}</h2>
          <p>{copy}</p>
          {stepper}
        </div>
        <div>{spec && <SpecList rows={spec} />}</div>
        {extra}
      </div>
    </section>
  )
}
