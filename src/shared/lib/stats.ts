export function median(xs: number[]): number {
  return quantile(xs, 0.5)
}

/** Linear-interpolated quantile; 0 for an empty list. */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const i = (s.length - 1) * q
  const lo = Math.floor(i)
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo)
}
