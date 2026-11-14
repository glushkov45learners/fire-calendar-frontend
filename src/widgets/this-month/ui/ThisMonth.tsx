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
  if (!result || !meta) return <Frame title="This month" copy="Loading the record…" />

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

  return (
    <Frame
      title={periodLabel(period)}
      stepper={<MonthStepper value={period} min={meta.date_min.slice(0, 7)} max={cur.period} current={cur.period} onChange={onChoose} />}
      copy={
        <>
          {isCurrent && `In the first ${cur.days_observed} days, `}
          <strong>
            {fmt(count)} {unit}
          </strong>
          : {d.figure} {d.unit} for {name} ({baseline} median {fmt(median)}).{' '}
          {hist.length > 0 && (rank === 1 ? `No other ${name} in ${from}–${to} was higher.` : `It ranks ${rank} of ${hist.length + 1} in ${from}–${to}.`)}
          {d.note && <span className="note"> {d.note}</span>}
        </>
      }
      spec={[
        ['Detections', fmt(count)],
        [`Median ${baseline}`, fmt(median)],
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

type StripProps = { hist: { year: number; v: number }[]; count: number; median: number; band?: [number, number]; label: string; name: string }

/** The month in every year as ticks on a log axis, with the median, the p25–p75 corridor and this month marked (design: "strip"). */
function Strip({ hist, count, median, band, label, name }: StripProps) {
  const hi = Math.max(count, median, band?.[1] ?? 0, ...hist.map((o) => o.v), 1)
  const X = (v: number) => 4 + (Math.log(v + 1) / Math.log(hi + 1)) * 752
  const xm = X(median)
  const xc = X(count)
  const anchor = (x: number) => (x > 660 ? 'end' : 'start')
  const off = (x: number) => (x > 660 ? -6 : 6)
  return (
    <svg className="strip" viewBox="0 0 760 86" role="img" aria-label={`${name} in every year of the period, with the median, the middle half of years and ${label} marked`}>
      {band && <rect x={X(band[0])} y="38" width={Math.max(1, X(band[1]) - X(band[0]))} height="13" fill="rgba(240,240,250,.12)" />}
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
      {band && (
        <text x={X(band[1]) + 6} y="34" opacity={X(band[1]) > 600 ? 0 : 1}>
          p25–p75
        </text>
      )}
      <circle cx={xc} cy="50.5" r="4.5" fill="#fff" />
      <path d={`M${xc} 55V68`} stroke="#fff" />
      <text className="hi" x={xc + off(xc)} y="80" textAnchor={anchor(xc)}>
        {label}
      </text>
      <text x="0" y="80" opacity={xc < 90 ? 0 : 1}>
        0
      </text>
      <text x="760" y="20" textAnchor="end" opacity={xm > 620 ? 0 : 1}>
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
  const max = Math.max(1, ...days.map((d) => d.count_h))
  const bw = W / dim
  return (
    <svg className="daily" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Detections per day, ${label}`}>
      {days.map((d) => {
        const i = +d.date.slice(8) - 1
        const h = (d.count_h / max) * (H - B - 10)
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
      <text x="0" y="10">
        {fmt(max)} / day
      </text>
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
