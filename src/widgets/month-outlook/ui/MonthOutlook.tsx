import type { ReactNode } from 'react'
import type { Cell, Series } from '@/entities/sensor'
import { fmt, MONTHS, MONTHS_SHORT } from '@/shared/lib/format'
import { SpecList } from '@/shared/ui/spec-list'

type Props = { current: Series['current'] | null; cells: Cell[] }

/** The current, still incomplete month against the same month in the earlier years of the period. */
export function MonthOutlook({ current, cells }: Props) {
  if (!current) return <Frame title="This month" copy="Loading the record…" />
  const name = `${MONTHS[current.month - 1]} ${current.year}`
  const hist = cells.filter((c): c is Cell & { value: number } => c.month === current.month && c.value !== null)
  const cur = current.value
  if (cur === null || !hist.length)
    return <Frame title={name} copy="The selected record has no data for this month. Choose Harmonized or MODIS to compare it with earlier years." />

  const md = current.median
  const k = (cur + 1) / (md + 1)
  const rank = hist.filter((o) => o.value > cur).length + 1
  const top = hist.reduce((a, b) => (b.value > a.value ? b : a))
  const m = MONTHS[current.month - 1]
  const so = `In the first ${current.daysObserved} days, `
  const versus = k >= 1.15 ? `${k.toFixed(1)} times the median` : k <= 0.87 ? `${Math.round(k * 100)}% of the median` : 'close to the median'

  const hi = Math.max(cur, ...hist.map((o) => o.value), 1)
  const X = (v: number) => 4 + (Math.log(v + 1) / Math.log(hi + 1)) * 752
  const xm = X(md)
  const xc = X(cur)
  const anchor = (x: number) => (x > 660 ? 'end' : 'start')
  const off = (x: number) => (x > 660 ? -6 : 6)

  return (
    <Frame
      title={name}
      copy={
        <>
          {so}
          <strong>{fmt(cur)} detections</strong>, {versus} for a whole {m}. {rank === 1 ? `No ${m} in ${hist[0].year}–${hist.at(-1)!.year} was higher.` : `It ranks ${rank} of ${hist.length + 1} in the period.`}
        </>
      }
      spec={[
        ['Detections so far', fmt(cur)],
        ['Median for ' + m, fmt(md)],
        ['Highest on record', `${fmt(top.value)} in ${top.year}`],
        ...(current.anomaly ? ([['Percentile', `${current.pct}, ${current.anomaly}`]] as [string, string][]) : []),
      ]}
      strip={
        <svg className="strip" viewBox="0 0 760 86" role="img" aria-label={`${m} in every year of the period, with the median and ${name} marked`}>
          <path d="M0 50.5H760" stroke="rgba(240,240,250,.3)" />
          {hist.map((o) => (
            <path key={o.year} d={`M${X(o.value)} 42V50`} stroke="rgba(240,240,250,.55)">
              <title>
                {o.year}: {fmt(o.value)}
              </title>
            </path>
          ))}
          <path d={`M${xm} 22V50`} stroke="#fff" />
          <text className="hi" x={xm + off(xm)} y="20" textAnchor={anchor(xm)}>
            Median
          </text>
          <circle cx={xc} cy="50.5" r="4.5" fill="#fff" />
          <path d={`M${xc} 55V68`} stroke="#fff" />
          <text className="hi" x={xc + off(xc)} y="80" textAnchor={anchor(xc)}>
            {MONTHS_SHORT[current.month - 1]} {current.year}
          </text>
          <text x="0" y="80" opacity={xc < 90 ? 0 : 1}>
            0
          </text>
          <text x="760" y="20" textAnchor="end" opacity={xm > 620 ? 0 : 1}>
            {fmt(hi)}
          </text>
        </svg>
      }
    />
  )
}

function Frame({ title, copy, spec, strip }: { title: string; copy: ReactNode; spec?: [string, string][]; strip?: ReactNode }) {
  return (
    <section className="chapter" id="month">
      <div className="split">
        <div>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <div>{spec && <SpecList rows={spec} />}</div>
        {strip}
      </div>
    </section>
  )
}
