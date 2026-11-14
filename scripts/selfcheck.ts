// Run: node scripts/selfcheck.ts — asserts for the geometry, stats and CSV helpers.
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { areaKm2, circlePolygon, pointInPolygon } from '../src/shared/lib/geo.ts'
import { logBin, logBinEdges, median, slope } from '../src/shared/lib/stats.ts'
import { toCsv } from '../src/features/export-csv/lib/toCsv.ts'

const zone = circlePolygon(51.389, 30.099, 30)
assert.ok(Math.abs(areaKm2(zone) - Math.PI * 30 * 30) < 40, 'circle area')
assert.ok(pointInPolygon(30.099, 51.389, zone) && !pointInPolygon(31, 51.389, zone), 'point in polygon')

assert.equal(median([3, 1, 2]), 2)
assert.equal(median([4, 1, 2, 3]), 2.5)
assert.equal(median([]), 0)
assert.equal(slope([[2000, 10], [2001, 12], [2002, 14]]), 2)

assert.equal(logBin(0, 3, 100, 8), 0)
assert.equal(logBin(100, 3, 100, 8), 8)
assert.equal(logBin(3, 3, 100, 8), 1)
assert.equal(logBin(5, 5, 5, 8), 8)
// Every edge must land in its own bin, and the count just below it in the previous one.
const edges = logBinEdges(120, 5000, 8)
edges.forEach((e, i) => {
  assert.equal(logBin(e, 120, 5000, 8), i + 1, `edge ${e}`)
  if (i) assert.equal(logBin(e - 1, 120, 5000, 8), i, `below edge ${e}`)
})

assert.equal(
  toCsv([{ year: 2020, month: 4, count: 7, median: 2 }], 'Chilecito, La Rioja', 'viirs'),
  'region,source,year,month,count,median\n"Chilecito, La Rioja",viirs,2020,4,7,2\n',
)
// src modules import through '@/' without extensions; map both for node, then load them after the hook is in place.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = new URL(`../src/${spec.slice(2)}`, import.meta.url).href
    if (/^(file:|\.)/.test(spec) && !/\.\w+$/.test(spec)) spec += '.ts'
    return next(spec, ctx)
  },
})
const { describeAnomaly } = await import('../src/widgets/anomaly-chart/lib/describeAnomaly.ts')
const { summarize } = await import('../src/widgets/summary-cards/lib/summarize.ts')
const { toRows } = await import('../src/widgets/burn-calendar/lib/toRows.ts')

assert.equal(describeAnomaly(507, 7).figure, '+500') // small median: hotspots, not +7143%
assert.equal(describeAnomaly(3, 10).unit, 'hotspots below the median')
assert.equal(describeAnomaly(1661, 121).figure, '13.7×')
assert.equal(describeAnomaly(2700, 1387).figure, '+95%')

const year = (y: number, n: number, months = 12) => Array.from({ length: months }, (_, i) => ({ year: y, month: i + 1, count: n, median: 0 }))
// Annual 12, 24, 36: +12/yr on a mean of 24 is +50%; the partial 2004 must not bend it.
assert.equal(summarize([...year(2001, 1), ...year(2002, 2), ...year(2003, 3), ...year(2004, 100, 1)]).trendPct, 50)
assert.equal(summarize([...year(2001, 1), ...year(2002, 2)]).trendPct, null)

assert.deepEqual(toRows([2014, 2013, 2012, 2011, 2010], (y) => y >= 2013, true).at(-1), { kind: 'gap', from: 2010, to: 2012 })
assert.equal(toRows([2014, 2013], () => false, false).length, 2)

console.log('selfcheck ok')
