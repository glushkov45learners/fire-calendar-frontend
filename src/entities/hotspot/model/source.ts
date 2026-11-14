import type { Source } from '@/shared/api'

export const SOURCES: { id: Source; label: string; note: string; since: number }[] = [
  { id: 'modis', label: 'MODIS', note: 'MODIS only: Terra and Aqua, 1 km', since: 2000 },
  { id: 'viirs', label: 'VIIRS', note: 'VIIRS only: S-NPP, NOAA-20, NOAA-21, 375 m', since: 2012 },
  { id: 'harmonized', label: 'Harmonized', note: 'Sensor-harmonized: MODIS + VIIRS', since: 2000 },
]

export const isSource = (s: string | null): s is Source => SOURCES.some((x) => x.id === s)
