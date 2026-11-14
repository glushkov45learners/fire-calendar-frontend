import type { ReactNode } from 'react'

/** Label / value rows on hairlines, the design's "spec" table. */
export function SpecList({ rows, className = 'spec' }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={className}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
