import { useState } from 'react'
import type { Region } from '@/entities/region'
import { ApiError, calendarCsv, hotspotsCsv } from '@/shared/api'
import { saveBlob } from '@/shared/lib/save-blob'

type Props = { region: Region; from: string; to: string; disabled: boolean }
type Kind = 'calendar' | 'hotspots'

const DownloadIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v10M4 8.5L8 12.5l4-4M2.5 14.5h11" />
  </svg>
)

export function ExportActions({ region, from, to, disabled }: Props) {
  const [busy, setBusy] = useState<Kind | null>(null)
  const [error, setError] = useState('')

  const run = async (kind: Kind) => {
    setBusy(kind)
    setError('')
    const q = { aoi: region.aoi, from, to }
    try {
      const blob = kind === 'calendar' ? await calendarCsv({ ...q, granularity: 'month' }) : await hotspotsCsv(q)
      saveBlob(blob, `fire-calendar_${kind}_${region.id.replace(/[^\w.-]+/g, '_')}_${from}_${to}.csv`)
    } catch (e) {
      setError(
        e instanceof ApiError && e.code === 'too_many_rows'
          ? 'Over 500,000 points. Choose a smaller area or a shorter period.'
          : `Download failed: ${(e as Error).message}`,
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="actions">
        <button type="button" className="action is-filled" disabled={disabled || !!busy} onClick={() => run('calendar')}>
          {busy === 'calendar' ? 'Preparing…' : 'Download CSV'} <DownloadIcon />
        </button>
        <button type="button" className="action" disabled={disabled || !!busy} onClick={() => run('hotspots')}>
          {busy === 'hotspots' ? 'Preparing…' : 'Raw points'} <DownloadIcon />
        </button>
      </div>
      <p className="hint" role="status">
        {error || 'Monthly harmonized and raw counts, or every FIRMS point inside the area.'}
      </p>
    </>
  )
}
