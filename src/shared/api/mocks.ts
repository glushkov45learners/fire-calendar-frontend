import type { FireStat } from './fires'

export function mockFireStats(days = 14): FireStat[] {
  const today = Date.now()
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(today - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    hotspots: Math.round(5 + Math.random() * 40),
    risk: Math.round(Math.random() * 100),
  }))
}
