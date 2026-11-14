// Run: node scripts/selfcheck.ts — asserts for geometry, stats, the mock API (contract 3 shape) and the series builder.
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// src modules import through '@/' without extensions, and the mock imports JSON; map all three for node.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = new URL(`../src/${spec.slice(2)}`, import.meta.url).href
    if (/^(file:|\.)/.test(spec) && !/\.\w+$/.test(spec)) spec += '.ts'
    const r = next(spec, ctx)
    return r.url.endsWith('.json') ? { ...r, importAttributes: { type: 'json' } } : r
  },
})

const { areaKm2, bboxPolygon, circlePolygon } = await import('../src/shared/lib/geo.ts')
const { median, quantile } = await import('../src/shared/lib/stats.ts')
const { mockAnalyze, mockCalendarCsv, mockMeta } = await import('../src/shared/api/mocks.ts')
const { buildSeries } = await import('../src/entities/sensor/model/sensor.ts')
const { findRegion, parseLatLon } = await import('../src/entities/region/model/presets.ts')
const { summarize } = await import('../src/pages/explorer/lib/summarize.ts')

assert.ok(Math.abs(areaKm2(circlePolygon(51.389, 30.099, 30)) - Math.PI * 30 * 30) < 40, 'circle area')
assert.equal(median([3, 1, 2]), 2)
assert.equal(median([4, 1, 2, 3]), 2.5)
assert.equal(median([]), 0)
assert.equal(quantile([1, 2, 3, 4, 5], 0.25), 2)

assert.deepEqual(parseLatLon('50.45, 30.52'), [50.45, 30.52])
assert.equal(parseLatLon('50.4,'), null)
assert.equal(findRegion('donbas')?.id, 'donbas')
assert.equal(findRegion('50.450,30.520')?.short, '25 km around point')
assert.equal(findRegion('nope'), null)

const meta = mockMeta()
const q = { aoi: bboxPolygon([29.25, 51.1, 30.65, 51.6]), from: '2020-01-01', to: '2026-11-14' }
const res = mockAnalyze(q)
assert.equal(res.monthly[0].period, '2000-11', 'history starts with Terra')
assert.equal(res.monthly.at(-1)!.period, '2026-11')
assert.equal(res.monthly.length, 2 + 25 * 12 + 11, 'one row per month, zeros included')
assert.equal(res.current_month.period, '2026-11')
assert.equal(res.seasonality.length, 12)
assert.equal(res.top_years.length, 25)
assert.ok(res.monthly.every((r) => r.pct >= 0 && r.pct <= 100))
// Chornobyl, April 2020: the exclusion-zone fires must stand out as extreme.
assert.equal(res.monthly.find((r) => r.period === '2020-04')!.anomaly, 'extreme')
assert.match(mockCalendarCsv({ ...q, granularity: 'month' }), /^period,count_h,frp_h,modis_raw,viirs_raw,median,z,pct,anomaly\n2020-01,/)

const harm = buildSeries(res, meta, 'harm')
const viirs = buildSeries(res, meta, 'viirs')
assert.equal(harm.cells.at(-1)!.month, 10, 'calendar stops at the last complete month')
assert.equal(harm.current.daysObserved, 14)
assert.equal(viirs.cells.find((c) => c.year === 2011 && c.month === 6)!.value, null, 'no VIIRS before 2012')
assert.notEqual(viirs.cells.find((c) => c.year === 2012 && c.month === 6)!.value, null)
assert.equal(harm.cells.find((c) => c.year === 2020 && c.month === 4)!.anomaly, 'extreme')

const s = summarize([
  { year: 2020, month: 4, value: 10, median: 0 },
  { year: 2020, month: 5, value: null, median: 0 },
  { year: 2021, month: 4, value: 3, median: 0 },
])
assert.deepEqual(s, { total: 13, peakMonth: 4, topYear: 2020, best: { year: 2020, month: 4, value: 10 } })

console.log('selfcheck ok')
