import type { CalendarCell } from '@/entities/hotspot'
import { fmt, monthName, signedPct } from '@/shared/lib/format'
import { summarize } from '../lib/summarize'

type Props = { cells: CalendarCell[] | null; loading?: boolean }

export function SummaryCards({ cells, loading }: Props) {
  const s = cells ? summarize(cells) : null
  // Name the years that were actually observed, not the requested period: VIIRS from 2000 has data from 2012.
  const first = cells?.[0]?.year
  const last = cells?.at(-1)?.year
  const period = first === last ? `${first}` : `${first} to ${last}`
  const stats = [
    { label: cells?.length ? `Hotspots, ${period}` : 'Hotspots', value: s ? fmt(s.total) : null },
    { label: 'Peak month', value: s?.peakMonth ? monthName(s.peakMonth) : '—' },
    {
      label: s?.topYear ? `Most active year, ${fmt(s.topYear.count)} hotspots` : 'Most active year',
      value: s?.topYear ? String(s.topYear.year) : '—',
    },
    {
      label: s?.trendPct != null ? `Trend per year, ${s.trendYears} complete years` : 'Trend needs 3 complete years',
      value: s?.trendPct != null ? signedPct(s.trendPct) : '—',
    },
  ]

  return (
    <dl className="panels grid grid-cols-2 gap-(--gap-panel)" aria-busy={loading || undefined}>
      {stats.map((st) => (
        <div key={st.label} className="panel grid content-between gap-3">
          <dt className="text-ink-3 text-sm">{st.label}</dt>
          <dd className="figure text-3xl">
            {loading || st.value === null ? <span className="bg-paper-3 block h-8 w-24 animate-pulse rounded" /> : st.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
