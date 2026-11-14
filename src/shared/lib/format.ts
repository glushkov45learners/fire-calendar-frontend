export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

const nf = new Intl.NumberFormat('en-US')
export const fmt = (n: number) => nf.format(Math.round(n))

/** "2020-04" → { year: 2020, month: 4 } */
export const parsePeriod = (p: string) => ({ year: +p.slice(0, 4), month: +p.slice(5, 7) })
