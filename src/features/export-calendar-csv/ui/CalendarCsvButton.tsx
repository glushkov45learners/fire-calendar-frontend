import { useState } from 'react'
import type { Area } from '@/entities/aoi'
import { calendarCsv, describeError } from '@/shared/api'
import { slug, useDownload } from '@/shared/lib/use-download'
import { DownloadIcon } from '@/shared/ui/icons'

type Props = { area: Area; from: string; to: string; disabled: boolean }
type Granularity = 'month' | 'day'

/** POST /calendar.csv: harmonized and raw counts per month or per day for the area. */
export function CalendarCsvButton({ area, from, to, disabled }: Props) {
  const [granularity, setGranularity] = useState<Granularity>('month')
  const { busy, error, run } = useDownload(describeError)
  const download = () =>
    run(() => calendarCsv({ aoi: area.geometry, from, to, granularity }), `fire-calendar_${slug(area.id)}_${granularity}_${from}_${to}.csv`)
  return (
    <div className="export">
      <div className="export-row">
        <button type="button" className="action is-filled" disabled={disabled || busy} onClick={download}>
          {busy ? 'Preparing…' : 'Calendar CSV'} <DownloadIcon />
        </button>
        <select aria-label="Calendar CSV rows" value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)}>
          <option value="month">Monthly</option>
          <option value="day">Daily</option>
        </select>
      </div>
      {error && (
        <p className="hint is-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
