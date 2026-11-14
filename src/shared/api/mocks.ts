// shortcut: the whole file is a stand-in for the Go backend (POST /api/calendar, POST /api/hotspots).
// Replace by setting VITE_USE_MOCKS=false once the backend serves FIRMS-derived counts; nothing else changes.
import type { Polygon } from 'geojson'
import { areaKm2, bbox, centroid, pointInPolygon } from '@/shared/lib/geo'
import { median } from '@/shared/lib/stats'
import type { CalendarCell, CalendarQuery, Hotspot, HotspotQuery, Source } from './fires'

type Event = { year: number; month: number; extra: number; at: [number, number]; days?: [number, number] }
type Profile = {
  id: string
  /** Mean monthly hotspots (harmonized, MODIS-equivalent) Jan..Dec for the reference area. */
  season: number[]
  refAreaKm2: number
  trendPerYear: number
  /** Extra linear growth per year from `from` on, on top of the trend. */
  growth?: { from: number; perYear: number }
  /** Log-normal spread of the yearly and monthly factors. */
  sigma: { year: number; month: number }
  events: Event[]
}

// shortcut: seasonality is hand-tuned to the brief, not fitted to FIRMS archives; the backend replaces it with real counts.
const PROFILES: Record<string, Profile> = {
  // Two peaks: spring field burning (Mar–Apr) and stubble burning after harvest (Aug–Oct).
  ukraine: {
    id: 'ukraine',
    season: [160, 230, 1500, 2100, 700, 420, 1150, 1850, 1700, 1250, 400, 140],
    refAreaKm2: 600_000,
    trendPerYear: 0,
    // Flat to 2015, then a steady rise, so every year from 2020 on outranks the early record.
    growth: { from: 2016, perYear: 0.09 },
    sigma: { year: 0.03, month: 0.08 },
    events: [],
  },
  // Low background; the April 2020 forest fires in the exclusion zone stand far above the median.
  chernobyl: {
    id: 'chernobyl',
    season: [0.4, 0.5, 3, 7, 4, 3, 4.5, 5, 3.5, 2, 0.5, 0.2],
    refAreaKm2: 2_800,
    trendPerYear: 0,
    sigma: { year: 0.22, month: 0.3 },
    events: [
      { year: 2015, month: 4, extra: 60, at: [30.05, 51.45] },
      { year: 2015, month: 8, extra: 35, at: [29.95, 51.35] },
      { year: 2020, month: 4, extra: 520, at: [29.78, 51.3] },
    ],
  },
  // Southern-hemisphere dry season: peak Jul–Oct; a large fire at the end of July 2026.
  chilecito: {
    id: 'chilecito',
    season: [4, 3, 3, 4, 6, 10, 22, 34, 36, 26, 12, 7],
    refAreaKm2: 6_400,
    trendPerYear: 0.015,
    sigma: { year: 0.22, month: 0.3 },
    events: [{ year: 2026, month: 7, extra: 260, at: [-67.62, -29.08], days: [24, 31] }],
  },
}

function pickProfile(area: Polygon): Profile {
  const [lon, lat] = centroid(area)
  if (lat < 0) return PROFILES.chilecito
  const nearPlant = Math.hypot(lon - 30.1, (lat - 51.39) * 1.6) < 1.2
  return nearPlant && areaKm2(area) < 20_000 ? PROFILES.chernobyl : PROFILES.ukraine
}

// Deterministic PRNG so the same area always gets the same series.
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  let a = h >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // Clamped to ±2.2σ so one freak draw doesn't become the record month.
  const normal = () => Math.max(-2.2, Math.min(2.2, Math.sqrt(-2 * Math.log(next() || 1e-9)) * Math.cos(2 * Math.PI * next())))
  return { next, normal }
}

const START: Record<Source, [number, number]> = { modis: [2000, 11], harmonized: [2000, 11], viirs: [2012, 1] }

/** How each sensor sees the same fires: different resolution and overpass schedule. */
function sensorFactor(source: Source, year: number, month: number): number {
  const t = year * 12 + month
  if (source === 'modis') {
    if (t < 2002 * 12 + 7) return 0.55 // Terra only, before Aqua
    if (t > 2022 * 12 + 10) return 0.82 // Terra orbit drift, fewer usable overpasses
    return 1
  }
  if (source === 'viirs') {
    let f = 3.2 // 375 m pixels resolve many small fires MODIS misses
    if (t >= 2018 * 12 + 4) f *= 1.3 // NOAA-20 joins S-NPP
    if (t >= 2024 * 12 + 1) f *= 1.15 // NOAA-21
    return f
  }
  return 1
}

function lastCompleteMonth(): [number, number] {
  const d = new Date()
  return d.getMonth() === 0 ? [d.getFullYear() - 1, 12] : [d.getFullYear(), d.getMonth()]
}

function series(area: Polygon, source: Source): CalendarCell[] {
  const p = pickProfile(area)
  const scale = areaKm2(area) / p.refAreaKm2
  const truth = rng(p.id) // shared by all sensors: the fires that actually happened
  const noise = rng(`${p.id}:${source}`)
  const [endY, endM] = lastCompleteMonth()
  const [startY, startM] = START[source]
  const cells: Omit<CalendarCell, 'median'>[] = []

  for (let y = 2000; y <= endY; y++) {
    const growth = p.growth ? 1 + p.growth.perYear * Math.max(0, y - p.growth.from) : 1
    const yearFactor = Math.exp(p.sigma.year * truth.normal()) * (1 + p.trendPerYear * (y - 2000)) * growth
    for (let m = 1; m <= 12; m++) {
      const monthFactor = Math.exp(p.sigma.month * truth.normal())
      const sensorNoise = Math.exp((source === 'harmonized' ? 0.05 : 0.18) * noise.normal())
      if (y * 12 + m < startY * 12 + startM || y * 12 + m > endY * 12 + endM) continue
      const event = p.events.find((e) => e.year === y && e.month === m)?.extra ?? 0
      const fires = (p.season[m - 1] * yearFactor * monthFactor + event) * scale
      cells.push({ year: y, month: m, count: Math.round(fires * sensorFactor(source, y, m) * sensorNoise) })
    }
  }

  // The baseline for a month is the same month in the other years, so the month never pulls its own median.
  return cells.map((c) => ({
    ...c,
    median: median(cells.filter((o) => o.month === c.month && o.year !== c.year).map((o) => o.count)),
  }))
}

export function mockCalendar(q: CalendarQuery): CalendarCell[] {
  return series(q.area, q.source).filter((c) => c.year >= q.from && c.year <= q.to)
}

function randomPointIn(area: Polygon, r: ReturnType<typeof rng>): [number, number] {
  const [w, s, e, n] = bbox(area)
  for (let i = 0; i < 200; i++) {
    const lon = w + r.next() * (e - w)
    const lat = s + r.next() * (n - s)
    if (pointInPolygon(lon, lat, area)) return [lon, lat]
  }
  return centroid(area)
}

// shortcut: points are capped at 800 per month for map performance; the backend should cluster or tile above that.
export function mockHotspots(q: HotspotQuery): Hotspot[] {
  const cell = series(q.area, q.source).find((c) => c.year === q.year && c.month === q.month)
  if (!cell?.count) return []
  const p = pickProfile(q.area)
  const r = rng(`${p.id}:${q.source}:${q.year}-${q.month}`)
  const n = Math.min(cell.count, 800)
  const [w, s, e, nn] = bbox(q.area)
  const spread = Math.max(e - w, nn - s) * 0.025
  const event = p.events.find((ev) => ev.year === q.year && ev.month === q.month)
  const eventShare = event ? event.extra / (event.extra + p.season[q.month - 1]) : 0
  const centers = Array.from({ length: Math.max(1, Math.min(14, Math.round(n / 30))) }, () => randomPointIn(q.area, r))
  const daysInMonth = new Date(q.year, q.month, 0).getDate()

  return Array.from({ length: n }, () => {
    const inEvent = event && r.next() < eventShare
    const [cx, cy] = inEvent ? event.at : centers[Math.floor(r.next() * centers.length)]
    const sigma = inEvent ? spread * 0.25 : spread
    let lon = cx + r.normal() * sigma
    let lat = cy + r.normal() * sigma
    if (!pointInPolygon(lon, lat, q.area)) [lon, lat] = [cx, cy]
    const [d0, d1] = inEvent && event.days ? event.days : [1, daysInMonth]
    const day = Math.min(daysInMonth, d0 + Math.floor(r.next() * (d1 - d0 + 1)))
    const hour = [1, 2, 10, 11, 13, 14][Math.floor(r.next() * 6)]
    return {
      lat: +lat.toFixed(4),
      lon: +lon.toFixed(4),
      acquired: new Date(Date.UTC(q.year, q.month - 1, day, hour, Math.floor(r.next() * 60))).toISOString(),
      frp: +(Math.exp(2.3 + r.normal() * 0.8) * (inEvent ? 3 : 1)).toFixed(1),
    }
  })
}
