// Sequential ramp rises steadily in lightness, so it survives colour-blind and greyscale viewing.
export const SEQ = ['#2b1055', '#5c1a7a', '#932667', '#c73e4c', '#ed6925', '#fbb61a', '#fcffa4']
// Diverging: cool below the median, dark at it, warm above.
export const DIV = ['#9ecae8', '#4a90c8', '#1f4f7a', '#26262c', '#7a3410', '#ed6925', '#fcffa4']

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

/** Colour at t ∈ [0, 1] along the stops. */
export function ramp(stops: string[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  const f = x - i
  const a = rgb(stops[i])
  const b = rgb(stops[i + 1])
  return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(',')})`
}

export const gradient = (stops: string[]) => `linear-gradient(90deg,${stops.join(',')})`
