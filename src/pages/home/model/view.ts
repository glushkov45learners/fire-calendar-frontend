import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { areaFromParam, areaToParam, DEFAULT_AREA, type Area } from '@/entities/aoi'
import { isRecordKind, type RecordKind } from '@/entities/analysis'
import { yearRange } from '@/entities/meta'
import { isCalendarMode, type CalendarMode } from '@/features/select-calendar-mode'
import type { Meta } from '@/shared/api'

// Before /meta answers, the year pickers span the archive's known start to this year.
const FALLBACK: readonly [number, number] = [2000, new Date().getUTCFullYear()]

const clampYear = (v: string | null, lo: number, hi: number, fallback: number) => {
  const n = Number(v)
  return v && Number.isInteger(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/**
 * The view lives in the URL (area, from, to, record, mode, month), so any view can be shared as a link.
 * shortcut: a drawn polygon stays in memory only (area=drawn); after a reload the default area shows. Encode it if links to drawn areas matter.
 */
export function useView(meta: Meta | null) {
  const [params, setParams] = useSearchParams()
  const [drawn, setDrawn] = useState<Area | null>(null)

  const [minY, maxY] = meta ? yearRange(meta) : FALLBACK
  const areaParam = params.get('area')
  const area = (areaParam === 'drawn' ? drawn : areaFromParam(areaParam)) ?? DEFAULT_AREA
  const rec = params.get('record')
  const record: RecordKind = isRecordKind(rec) ? rec : 'harm'
  const md = params.get('mode')
  const mode: CalendarMode = isCalendarMode(md) ? md : 'count'
  const from = clampYear(params.get('from'), minY, maxY, minY)
  const to = Math.max(from, clampYear(params.get('to'), minY, maxY, maxY))
  const m = params.get('month')
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : null

  // The API rejects dates outside the archive, so the whole-year period is clipped to it.
  const range = meta
    ? {
        from: `${from}-01-01` < meta.date_min ? meta.date_min : `${from}-01-01`,
        to: `${to}-12-31` > meta.date_max ? meta.date_max : `${to}-12-31`,
      }
    : null

  const set = (patch: Record<string, string | null>) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(patch)) {
          if (v === null) p.delete(k)
          else p.set(k, v)
        }
        return p
      },
      { replace: true },
    )

  return {
    area,
    record,
    mode,
    from,
    to,
    years: { from, to, min: minY, max: maxY },
    month,
    range,
    setArea: (a: Area) => {
      if (a.kind === 'drawn') setDrawn(a)
      set({ area: areaToParam(a) })
    },
    clearDrawn: () => {
      if (area.kind === 'drawn') set({ area: null })
      setDrawn(null)
    },
    setPeriod: (f: number, t: number) => set({ from: String(f), to: String(t) }),
    setRecord: (k: RecordKind) => set({ record: k }),
    setMode: (v: CalendarMode) => set({ mode: v }),
    setMonth: (p: string | null) => set({ month: p }),
  }
}
