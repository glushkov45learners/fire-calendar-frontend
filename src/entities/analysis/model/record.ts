import type { MonthlyRow } from '@/shared/api'

/** Which series the calendar reads: the harmonized one, or a raw sensor. */
export type RecordKind = 'harm' | 'modis' | 'viirs'

export const RECORDS = [
  { id: 'harm', label: 'Harmonized' },
  { id: 'modis', label: 'MODIS' },
  { id: 'viirs', label: 'VIIRS' },
] as const satisfies readonly { id: RecordKind; label: string }[]

export const isRecordKind = (v: string | null): v is RecordKind => RECORDS.some((r) => r.id === v)

export const recordValue = (r: MonthlyRow, k: RecordKind) => (k === 'harm' ? r.count_h : k === 'modis' ? r.modis_raw : r.viirs_raw)
