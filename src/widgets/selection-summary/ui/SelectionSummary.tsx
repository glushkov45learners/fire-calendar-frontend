import { cropMonthly } from '@/entities/analysis'
import type { AnalyzeResult } from '@/shared/api'
import { fmt, MONTHS, periodLabel } from '@/shared/lib/format'
import { SpecList } from '@/shared/ui/spec-list'

type Props = { result: AnalyzeResult | null; from: number; to: number; baseline: string }

/** "In this selection": the backend's totals for the period, plus the area as the backend measured it. */
export function SelectionSummary({ result, from, to, baseline }: Props) {
  if (!result) return <SpecList rows={[['Detections', '…']]} />
  const peak = result.seasonality.reduce((a, b) => (b.median > a.median ? b : a), result.seasonality[0])
  const top = result.top_years[0]
  // Complete months only: the current one is still growing.
  const largest = cropMonthly(result.monthly, from, to)
    .filter((r) => r.period < result.current_month.period)
    .reduce<AnalyzeResult['monthly'][number] | null>((a, b) => (!a || b.count_h > a.count_h ? b : a), null)
  return (
    <SpecList
      rows={[
        ['Detections, harmonized', fmt(result.totals.count_h)],
        // MODIS and VIIRS S-NPP only, the two sensors the record is built from; the hotspots CSV also carries NOAA-20 and NOAA-21.
        ['Raw hotspots, MODIS + S-NPP', fmt(result.totals.hotspots_raw)],
        [`Peak month, ${baseline} median`, peak ? MONTHS[peak.month - 1] : 'No data'],
        [`Most active year, ${baseline}`, top ? `${top.year}, ${fmt(top.count_h)}` : 'No data'],
        ['Largest month in period', largest && largest.count_h > 0 ? `${periodLabel(largest.period, true)}, ${fmt(largest.count_h)}` : 'No data'],
        ['Area', `${fmt(result.area_km2)} km², ${fmt(result.cells)} cells`],
      ]}
    />
  )
}
