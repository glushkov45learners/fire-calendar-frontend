import { getMeta, type Meta } from '@/shared/api'
import { useAsync } from '@/shared/lib/use-async'

let cached: Promise<Meta> | null = null

/** GET /meta once per session; a failed attempt is forgotten so a retry asks again. */
function loadMeta(): Promise<Meta> {
  cached ??= getMeta().catch((e) => {
    cached = null
    throw e
  })
  return cached
}

export const useMeta = () => useAsync(() => loadMeta(), [])

/** "VIIRS-equivalent" or "MODIS-equivalent": the scale `count_h` is expressed in (model.reference_scale). */
export const scaleName = (m: Meta) => (m.model.reference_scale === 'MODIS' ? 'MODIS-equivalent' : 'VIIRS-equivalent')
export const unitOf = (m: Meta) => `${scaleName(m)} detections`
export const baselineLabel = (m: Meta) => `${m.baseline_years[0]}–${m.baseline_years[1]}`
export const yearRange = (m: Meta) => [+m.date_min.slice(0, 4), +m.date_max.slice(0, 4)] as const
