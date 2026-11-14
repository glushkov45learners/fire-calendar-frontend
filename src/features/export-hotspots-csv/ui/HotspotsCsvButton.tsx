import type { Area } from '@/entities/aoi'
import { describeError, hotspotsCsv } from '@/shared/api'
import { slug, useDownload } from '@/shared/lib/use-download'
import { DownloadIcon } from '@/shared/ui/icons'

type Props = { area: Area; from: string; to: string; disabled: boolean }

/** POST /hotspots.csv: every raw FIRMS point inside the polygon, all satellites and all types, up to 500,000 rows. */
export function HotspotsCsvButton({ area, from, to, disabled }: Props) {
  const { busy, error, run } = useDownload(describeError)
  const download = () => run(() => hotspotsCsv({ aoi: area.geometry, from, to }), `fire-calendar_${slug(area.id)}_hotspots_${from}_${to}.csv`)
  return (
    <div className="export">
      <button type="button" className="action" disabled={disabled || busy} onClick={download}>
        {busy ? 'Preparing…' : 'Raw hotspots CSV'} <DownloadIcon />
      </button>
      {error && (
        <p className="hint is-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
