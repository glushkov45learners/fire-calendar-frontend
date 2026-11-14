import { DownloadIcon } from 'lucide-react'
import type { CalendarCell } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { toCsv } from '../lib/toCsv'

type Props = { cells: CalendarCell[] | null; region: string; source: string; period: string }

export function ExportCsvButton({ cells, region, source, period }: Props) {
  const download = () => {
    if (!cells) return
    const blob = new Blob([toCsv(cells, region, source)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `burn-calendar_${region.toLowerCase().replace(/\W+/g, '-')}_${source}_${period}.csv`
    a.click()
    // Revoking in the same tick can cancel the download in Firefox and Safari.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Button variant="outline" onClick={download} disabled={!cells?.length}>
      <DownloadIcon aria-hidden data-icon="inline-start" />
      Download CSV
    </Button>
  )
}
