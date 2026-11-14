/** Age buckets, FIRMS-style: the newest detections are drawn hottest. */
export const AGE_BUCKETS = [
  { id: 1, label: 'Last 24 h', maxHours: 24 },
  { id: 2, label: '1 to 3 days', maxHours: 72 },
  { id: 3, label: '3 to 7 days', maxHours: 168 },
  { id: 4, label: 'Older', maxHours: Infinity },
] as const

export function ageBucket(acquired: string, reference: Date): number {
  const hours = (reference.getTime() - new Date(acquired).getTime()) / 3_600_000
  return AGE_BUCKETS.find((b) => hours <= b.maxHours)?.id ?? 4
}
