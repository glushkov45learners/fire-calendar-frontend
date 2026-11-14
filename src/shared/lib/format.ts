export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const nf = new Intl.NumberFormat('en-US')
export const fmt = (n: number) => nf.format(Math.round(n))

export const monthName = (m: number) => MONTHS[m - 1]
export const monthShort = (m: number) => MONTHS[m - 1].slice(0, 3)

/** Signed percentage with a real minus sign, e.g. "+312%" or "−40%". */
export const signedPct = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(Math.abs(x) < 10 ? 1 : 0)}%`
