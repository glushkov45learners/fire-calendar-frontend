import { fmt, signedPct } from '@/shared/lib/format'

/** Below this median a percentage overstates the change (7 → 507 reads as +7143%). */
export const MIN_BASELINE = 20
/** From this ratio on, "13.7×" reads better than "+1273%". */
const RATIO_FROM = 3

export type Anomaly = { figure: string; unit: string; note?: string }

export function describeAnomaly(count: number, median: number): Anomaly {
  const diff = count - median
  if (median < MIN_BASELINE) {
    const sign = diff > 0 ? '+' : diff < 0 ? '\u2212' : ''
    return {
      figure: `${sign}${fmt(Math.abs(diff))}`,
      unit: diff >= 0 ? 'hotspots above the median' : 'hotspots below the median',
      note: `The median is under ${MIN_BASELINE}, so the change is shown in hotspots, not percent.`,
    }
  }
  const ratio = count / median
  if (ratio >= RATIO_FROM) return { figure: `${ratio.toFixed(1)}\u00d7`, unit: 'the median' }
  return { figure: signedPct((diff / median) * 100), unit: 'against the median' }
}
