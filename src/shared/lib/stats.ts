export function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Least-squares slope of y over x; 0 when fewer than two points. */
export function slope(points: [number, number][]): number {
  const n = points.length
  if (n < 2) return 0
  const mx = points.reduce((a, p) => a + p[0], 0) / n
  const my = points.reduce((a, p) => a + p[1], 0) / n
  const num = points.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0)
  const den = points.reduce((a, [x]) => a + (x - mx) ** 2, 0)
  return den ? num / den : 0
}

/** Log-spaced bin over [lo, hi] (the smallest and largest non-zero counts): 1..steps, 0 for zero. */
export function logBin(count: number, lo: number, hi: number, steps: number): number {
  if (count <= 0) return 0
  if (hi <= lo) return steps
  const t = Math.log(Math.max(count, lo) / lo) / Math.log(hi / lo)
  return Math.min(steps, 1 + Math.floor((steps - 1) * t + 1e-9))
}

/** Smallest count in each bin 1..steps. */
export function logBinEdges(lo: number, hi: number, steps: number): number[] {
  if (hi <= lo) return Array(steps).fill(Math.max(1, lo))
  return Array.from({ length: steps }, (_, i) => Math.ceil(lo * (hi / lo) ** (i / (steps - 1)) - 1e-9))
}
