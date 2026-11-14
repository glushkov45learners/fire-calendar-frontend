export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

const nf = new Intl.NumberFormat('en-US')
export const fmt = (n: number) => nf.format(Math.round(n))

/** Signed percentage with a real minus sign, e.g. "+312%" or "−40%". */
export const signedPct = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(Math.abs(x) < 10 ? 1 : 0)}%`

/** "2020-04" → { year: 2020, month: 4 } */
export const parsePeriod = (p: string) => ({ year: +p.slice(0, 4), month: +p.slice(5, 7) })
export const toPeriod = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`
export const periodLabel = (p: string, short = false) => {
  const { year, month } = parsePeriod(p)
  return `${(short ? MONTHS_SHORT : MONTHS)[month - 1]} ${year}`
}
export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

/** The month after or before `p`. */
export function shiftPeriod(p: string, by: number): string {
  const { year, month } = parsePeriod(p)
  const t = year * 12 + (month - 1) + by
  return toPeriod(Math.floor(t / 12), (t % 12) + 1)
}
