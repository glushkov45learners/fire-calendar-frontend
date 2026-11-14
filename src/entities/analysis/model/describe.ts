import { SMALL_MEDIAN } from '@/shared/config'
import { fmt, signedPct } from '@/shared/lib/format'

/** From this ratio on, "13.7×" reads better than "+1273%". */
const RATIO_FROM = 3

export type AnomalyText = { figure: string; unit: string; note?: string }

/**
 * A count against its median, worded so small medians don't produce huge percentages:
 * under SMALL_MEDIAN the change is given in detections, not percent or ×.
 */
export function describeAnomaly(count: number, median: number): AnomalyText {
  const diff = count - median
  if (median < SMALL_MEDIAN) {
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : ''
    return {
      figure: `${sign}${fmt(Math.abs(diff))}`,
      unit: diff >= 0 ? 'detections above the median' : 'detections below the median',
      note: `The median is under ${SMALL_MEDIAN}, so the change is shown in detections, not percent.`,
    }
  }
  const ratio = count / median
  if (ratio >= RATIO_FROM) return { figure: `${ratio.toFixed(1)}×`, unit: 'the median' }
  return { figure: signedPct((diff / median) * 100), unit: 'against the median' }
}
