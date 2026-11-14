import type { MultiPolygon } from 'geojson'
import border from './ukraine-border.json'

/** Coverage of the archive (contract 1): Ukraine, clipped to the border by the ETL. [west, south, east, north] */
export const COVERAGE_BBOX: [number, number, number, number] = [22.0, 44.0, 40.3, 52.4]

/** First complete month of each raw record. Terra detections start in November 2000; VIIRS S-NPP is the only VIIRS satellite in the series. */
export const SENSOR_START = { modis: '2000-11', viirs: '2012-01' } as const
/** Aqua joins Terra in mid-2002: a step in raw MODIS that no fire caused. */
export const AQUA_JOINS_YEAR = 2002
export const VIIRS_START_YEAR = 2012

export const DEFAULT_RADIUS_KM = 25
export const MAX_RADIUS_KM = 500
/** MapLibre's Web Mercator stops at ±85°; ±80 plus the largest radius stays inside it. */
export const MAX_ABS_LAT = 80

/** /analyze returns `daily` only for periods up to this many years. */
export const DAILY_MAX_YEARS = 3
/** Below this median a percentage overstates the change (7 → 507 reads as +7143%). */
export const SMALL_MEDIAN = 20

export const ANALYZE_DEBOUNCE_MS = 300

/** Ukraine's border as drawn in the design mockup (one self-crossing vertex near the Dniester estuary removed). */
export const UKRAINE_BORDER = border as MultiPolygon
