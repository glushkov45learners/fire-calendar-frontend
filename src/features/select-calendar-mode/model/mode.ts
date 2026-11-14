import type { RecordKind } from '@/entities/analysis'

export type CalendarMode = 'count' | 'anom'

export const isCalendarMode = (v: string | null): v is CalendarMode => v === 'count' || v === 'anom'

/** Anomaly needs the backend's norm, which exists for the harmonized record only. */
export const effectiveMode = (mode: CalendarMode, record: RecordKind): CalendarMode => (record === 'harm' ? mode : 'count')
