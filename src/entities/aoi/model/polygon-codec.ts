import type { Polygon } from 'geojson'

/**
 * A polygon's outer ring as a URL-safe string. Coordinates are rounded to 1e-4° (~11 m), stored as deltas from the previous
 * vertex, zig-zagged and written as 5-bit groups in base64url characters (a sixth bit says "more groups follow").
 * Nothing in it needs percent-encoding, and a typical hand-drawn shape is a few dozen characters.
 */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const SCALE = 1e4
/** Refuse absurd links: a hand-drawn shape never has this many vertices. */
const MAX_VERTICES = 1000

function write(out: string[], n: number) {
  let v = n < 0 ? -2 * n - 1 : 2 * n
  while (v >= 32) {
    out.push(ALPHABET[32 | (v & 31)])
    v = Math.floor(v / 32)
  }
  out.push(ALPHABET[v])
}

export function encodePolygon(p: Polygon): string {
  const ring = p.coordinates[0] ?? []
  const open = ring.length > 1 && ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1] ? ring.slice(0, -1) : ring
  const out: string[] = []
  let lon = 0
  let lat = 0
  for (const [x, y] of open) {
    const qx = Math.round(x * SCALE)
    const qy = Math.round(y * SCALE)
    write(out, qx - lon)
    write(out, qy - lat)
    lon = qx
    lat = qy
  }
  return out.join('')
}

export function decodePolygon(s: string): Polygon | null {
  const nums: number[] = []
  let v = 0
  let shift = 1
  for (const ch of s) {
    const i = ALPHABET.indexOf(ch)
    if (i < 0) return null
    v += (i & 31) * shift
    if (i & 32) {
      shift *= 32
      if (shift > 2 ** 40) return null
    } else {
      nums.push(v % 2 ? -(v + 1) / 2 : v / 2)
      v = 0
      shift = 1
    }
  }
  // A dangling continuation, an odd number of values, or too few/many vertices: not one of ours.
  if (shift !== 1 || nums.length % 2 || nums.length < 6 || nums.length > MAX_VERTICES * 2) return null
  const ring: [number, number][] = []
  let lon = 0
  let lat = 0
  for (let i = 0; i < nums.length; i += 2) {
    lon += nums[i]
    lat += nums[i + 1]
    const x = lon / SCALE
    const y = lat / SCALE
    if (Math.abs(x) > 180 || Math.abs(y) > 90) return null
    ring.push([x, y])
  }
  ring.push(ring[0])
  return { type: 'Polygon', coordinates: [ring] }
}
