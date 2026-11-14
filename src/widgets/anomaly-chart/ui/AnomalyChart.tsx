import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CalendarCell } from '@/entities/hotspot'
import { describeAnomaly } from '../lib/describeAnomaly'
import { fmt, monthName, monthShort } from '@/shared/lib/format'

type Props = {
  /** All cells of the selected year. */
  yearCells: CalendarCell[]
  selected: { year: number; month: number } | null
  /** The years the median is taken over, e.g. "2000 to 2026". */
  baseline: string
}

const tick = { fill: 'var(--ink-3)', fontSize: 12 }

export function AnomalyChart({ yearCells, selected, baseline }: Props) {
  const cell = selected && yearCells.find((c) => c.month === selected.month)
  if (!selected || !cell) {
    return (
      <p className="text-ink-3 grid min-h-64 place-content-center">
        {selected ? 'Pick a month in the calendar.' : 'No observations in this period.'}
      </p>
    )
  }

  const headline = describeAnomaly(cell.count, cell.median)
  const data = Array.from({ length: 12 }, (_, i) => {
    const c = yearCells.find((x) => x.month === i + 1)
    return { month: monthShort(i + 1), m: i + 1, count: c?.count ?? null, median: c?.median ?? null }
  })

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1">
          <h2 className="text-xl">
            {monthName(selected.month)} {selected.year} against the median
          </h2>
          <p className="text-ink-3 text-sm">
            <span className="num">{fmt(cell.count)}</span> hotspots; the median {monthName(selected.month)} of the
            other years, {baseline}, is <span className="num">{fmt(cell.median)}</span>.
          </p>
          {headline.note && <p className="text-ink-3 text-sm">{headline.note}</p>}
        </div>
        <p className="grid justify-items-end gap-1 text-right" aria-label={`${headline.figure} ${headline.unit}`}>
          <span className="figure text-5xl">{headline.figure}</span>
          <span className="text-ink-3 text-sm">{headline.unit}</span>
        </p>
      </div>

      <div className="h-60" role="img" aria-label={`Hotspots per month in ${selected.year} with the multi-year median`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--rule)" />
            <XAxis dataKey="month" tick={tick} tickLine={false} axisLine={{ stroke: 'var(--rule)' }} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={56} tickFormatter={fmt} />
            <Tooltip
              cursor={{ fill: 'var(--paper-3)' }}
              contentStyle={{
                background: 'var(--paper-2)',
                border: '1px solid var(--rule-2)',
                borderRadius: 'var(--radius-panel)',
                color: 'var(--ink)',
              }}
              labelStyle={{ color: 'var(--ink)' }}
              formatter={(v, name) => [fmt(Number(v)), name]}
            />
            <Bar dataKey="count" name={`${selected.year}`} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.m} fill={d.m === selected.month ? 'var(--signal)' : 'var(--rule-2)'} />
              ))}
            </Bar>
            <Line
              dataKey="median"
              name="Median"
              type="monotone"
              stroke="var(--cool)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-ink-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <span className="flex items-center gap-2">
          <span className="bg-signal h-2.5 w-4 rounded-[2px]" aria-hidden />
          {monthName(selected.month)} {selected.year}
        </span>
        <span className="flex items-center gap-2">
          <span className="bg-rule-2 h-2.5 w-4 rounded-[2px]" aria-hidden />
          Other months of {selected.year}
        </span>
        <span className="flex items-center gap-2">
          <span className="border-cool w-4 border-t-2 border-dashed" aria-hidden />
          Median of the other years, {baseline}
        </span>
      </p>
    </div>
  )
}
