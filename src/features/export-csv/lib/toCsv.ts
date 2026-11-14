import type { CalendarCell } from '@/shared/api'

const esc = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsv(cells: CalendarCell[], region: string, source: string): string {
  const rows = cells.map((c) => [region, source, c.year, c.month, c.count, c.median].map(esc).join(','))
  return ['region,source,year,month,count,median', ...rows].join('\n') + '\n'
}
