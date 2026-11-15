import { useEffect, useRef, useState } from 'react'
import type { Area } from '@/entities/aoi'
import { calendarCsv, describeError, hotspotsCsv } from '@/shared/api'
import { slug, useDownload } from '@/shared/lib/use-download'
import { ChevronIcon, DownloadIcon } from '@/shared/ui/icons'

type Props = { area: Area; from: string; to: string; disabled: boolean }

/**
 * One "Export CSV" button with a menu:
 * POST /calendar.csv (harmonized and raw counts per month or per day) and
 * POST /hotspots.csv (every raw FIRMS point inside the polygon, all satellites and types, up to 500,000 rows).
 */
export function ExportMenu({ area, from, to, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [sub, setSub] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const { busy, error, run } = useDownload(describeError)
  const base = `fire-calendar_${slug(area.id)}`

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'keydown' ? (e as KeyboardEvent).key === 'Escape' : !root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const toggle = () => {
    setSub(false)
    setOpen((v) => !v)
  }
  const pick = (get: () => Promise<Blob>, filename: string) => {
    setOpen(false)
    setSub(false)
    void run(get, filename)
  }
  const calendar = (granularity: 'month' | 'day') =>
    pick(() => calendarCsv({ aoi: area.geometry, from, to, granularity }), `${base}_${granularity}_${from}_${to}.csv`)

  return (
    <div className="export" ref={root}>
      <button
        type="button"
        className="action is-filled"
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        {busy ? 'Preparing…' : 'Export CSV'} {busy ? <DownloadIcon /> : <ChevronIcon />}
      </button>
      {open && (
        <ul className="export-menu" role="menu">
          <li
            role="none"
            className={`has-sub${sub ? ' is-open' : ''}`}
            onMouseEnter={() => setSub(true)}
            onMouseLeave={() => setSub(false)}
            onFocus={() => setSub(true)}
          >
            <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={sub} onClick={() => setSub((v) => !v)}>
              Calendar <ChevronIcon />
            </button>
            {sub && (
              <ul className="export-menu export-sub" role="menu">
                <li role="none">
                  <button type="button" role="menuitem" onClick={() => calendar('month')}>
                    Monthly
                  </button>
                </li>
                <li role="none">
                  <button type="button" role="menuitem" onClick={() => calendar('day')}>
                    Daily
                  </button>
                </li>
              </ul>
            )}
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => pick(() => hotspotsCsv({ aoi: area.geometry, from, to }), `${base}_hotspots_${from}_${to}.csv`)}
            >
              Raw hotspots
            </button>
          </li>
        </ul>
      )}
      {error && (
        <p className="hint is-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
