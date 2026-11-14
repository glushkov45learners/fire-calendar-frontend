// Run: node scripts/selfcheck.ts — asserts for geometry, the series rules, anomaly wording, the API boundary and the contract-3 mock.
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'

// src modules import through '@/' without extensions (files or folders with index.ts) and import JSON; map all of that for node.
registerHooks({
  resolve(spec, ctx, next) {
    if (spec.startsWith('@/')) spec = new URL(`../src/${spec.slice(2)}`, import.meta.url).href
    if (/^(file:|\.)/.test(spec) && !/\.\w+$/.test(spec)) {
      const url = new URL(spec, ctx.parentURL)
      spec = existsSync(new URL(`${url.href}.ts`)) ? `${url.href}.ts` : `${url.href}/index.ts`
    }
    const r = next(spec, ctx)
    return r.url.endsWith('.json') ? { ...r, importAttributes: { type: 'json' } } : r
  },
})

const { areaKm2, bboxPolygon, cellBounds, cellIdOf, outerRings, pointInGeometry, selfIntersects } = await import('../src/shared/lib/geo.ts')
const { median, quantile } = await import('../src/shared/lib/stats.ts')
const { shiftPeriod } = await import('../src/shared/lib/format.ts')
const { sortAnalyze } = await import('../src/shared/api/endpoints.ts')
const { mockAnalyze, mockCalendarCsv, mockGrid, mockHotspotsCsv, mockMeta, MockError } = await import('../src/shared/api/mocks/handlers.ts')
const { handle } = await import('../src/shared/api/mocks/server.ts')
const { areaFromParam, isInCoverage, parseLatLon, pointArea, PRESETS } = await import('../src/entities/aoi/model/area.ts')
const { buildCells, cropMonthly, maskReason } = await import('../src/entities/analysis/model/series.ts')
const { describeAnomaly } = await import('../src/entities/analysis/model/describe.ts')

/* stats, csv, periods */
assert.equal(median([3, 1, 2]), 2)
assert.equal(median([4, 1, 2, 3]), 2.5)
assert.equal(median([]), 0)
assert.equal(quantile([1, 2, 3, 4, 5], 0.25), 2)
assert.equal(shiftPeriod('2020-12', 1), '2021-01')
assert.equal(shiftPeriod('2020-01', -1), '2019-12')

/* point + radius → polygon */
const pt = pointArea(51.39, 30.1, 30)
const ring = (pt.geometry as { coordinates: number[][][] }).coordinates[0]
assert.equal(ring.length, 65, '64 vertices plus the closing one')
assert.deepEqual(ring[0], ring.at(-1), 'ring is closed')
assert.ok(Math.abs(areaKm2(pt.geometry) - Math.PI * 30 * 30) < 30, 'circle area')
assert.equal(pt.id, '51.39,30.1,30')
assert.equal(pointArea(89, 30, 10).id.split(',')[0], '80', 'latitude clamped to ±80')
assert.equal(pointArea(50, 30, 9999).short, '500 km around point', 'radius clamped')
assert.deepEqual(areaFromParam('51.39,30.1,30')?.geometry, pt.geometry, 'URL round trip')
assert.equal(areaFromParam('10,10,25'), null, 'a point outside Ukraine is not restored')
assert.equal(isInCoverage(-29.1, -67.5), false, 'Chilecito is outside coverage')
assert.deepEqual(parseLatLon('50.45, 30.52'), [50.45, 30.52])
assert.equal(parseLatLon('50.4,'), null)
assert.equal(PRESETS.find((p) => p.id === 'ua')!.geometry.type, 'MultiPolygon')
assert.ok(Math.abs(areaKm2(PRESETS.find((p) => p.id === 'ua')!.geometry) - 603_550) < 60_000, 'Ukraine border area is plausible')
assert.ok(outerRings(PRESETS[3].geometry)[0].length > 100)
// The backend (PostGIS) rejects self-crossing rings; the mockup's border had one near the Dniester estuary.
assert.ok(PRESETS.every((p) => !selfIntersects(p.geometry)), 'no preset ring crosses itself')
assert.equal(selfIntersects(bboxPolygon([0, 0, 1, 1])), false)
assert.equal(selfIntersects({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]]] }), true, 'bowtie')

/* describeAnomaly: small medians are told in detections, not percent */
assert.equal(describeAnomaly(507, 7).figure, '+500')
assert.equal(describeAnomaly(3, 10).unit, 'detections below the median')
assert.ok(describeAnomaly(3, 10).note)
assert.equal(describeAnomaly(1661, 121).figure, '13.7×')
assert.equal(describeAnomaly(2700, 1387).figure, '+95%')
assert.equal(describeAnomaly(20, 19.9).figure, '+0', 'just under the threshold still in detections')

/* mock = contract 3 */
const meta = mockMeta()
const chornobyl = PRESETS[0].geometry
const res = sortAnalyze(mockAnalyze({ aoi: chornobyl, from: '2020-01-01', to: '2022-12-31' }))
assert.equal(res.monthly[0].period, '2000-11', 'history starts with Terra')
assert.equal(res.monthly.at(-1)!.period, '2026-11')
assert.equal(res.monthly.length, 2 + 25 * 12 + 11, 'one row per month, zeros included')
assert.equal(res.current_month.period, '2026-11')
assert.equal(res.current_month.days_observed, 14)
assert.equal(res.seasonality.length, 12)
assert.equal(res.top_years.length, 25)
assert.ok(res.top_years[0].count_h >= res.top_years[1].count_h, 'top_years sorted descending')
assert.equal(res.daily.length, 365 + 366 + 365, 'daily for a 3-year period, zero days included')
assert.equal(sortAnalyze(mockAnalyze({ aoi: chornobyl, from: '2001-01-01', to: '2026-11-14' })).daily.length, 0, 'no daily beyond 3 years')
assert.equal(res.monthly.find((r) => r.period === '2020-04')!.anomaly, 'extreme', 'Chornobyl April 2020 stands out')
assert.match(mockCalendarCsv({ aoi: chornobyl, from: '2020-01-01', to: '2020-12-31', granularity: 'month' }), /^period,count_h,frp_h,modis_raw,viirs_raw,median,z,pct,anomaly\n2020-01,/)
assert.match(mockCalendarCsv({ aoi: chornobyl, from: '2020-01-01', to: '2020-01-31', granularity: 'day' }), /^period,count_h,frp_h,modis_raw,viirs_raw\n2020-01-01,/)

/* sorting at the API boundary */
const shuffled = { ...res, monthly: [...res.monthly].reverse(), daily: [...res.daily].reverse() }
assert.deepEqual(sortAnalyze(shuffled).monthly.map((r) => r.period), res.monthly.map((r) => r.period))
assert.equal(sortAnalyze(shuffled).daily[0].date, '2020-01-01')

/* errors */
const err = (f: () => unknown) => {
  try {
    f()
  } catch (e) {
    return e instanceof MockError ? `${e.status} ${e.code}` : String(e)
  }
  return 'no error'
}
assert.equal(err(() => mockAnalyze({ aoi: pointArea(10, 10).geometry, from: '2020-01-01', to: '2020-12-31' })), '400 outside_coverage')
assert.equal(err(() => mockAnalyze({ aoi: chornobyl, from: '2021-01-01', to: '2020-12-31' })), '400 invalid_range')
assert.equal(err(() => mockAnalyze({ aoi: { type: 'Point', coordinates: [30, 50] }, from: '2020-01-01', to: '2020-12-31' })), '400 invalid_aoi')
assert.equal(err(() => mockAnalyze({ aoi: { type: 'Polygon', coordinates: [[[30, 50], [31, 51], [31, 50], [30, 51], [30, 50]]] }, from: '2020-01-01', to: '2020-12-31' })), '400 invalid_aoi', 'bowtie rejected like PostGIS')
assert.equal(err(() => mockHotspotsCsv({ aoi: PRESETS[3].geometry, from: meta.date_min, to: meta.date_max })), '413 too_many_rows', 'all Ukraine, 26 years')
const routed = handle('POST', '/hotspots.csv', JSON.stringify({ aoi: PRESETS[3].geometry, from: meta.date_min, to: meta.date_max }))
assert.equal(routed.status, 413)
assert.equal(JSON.parse(routed.body).error.code, 'too_many_rows', 'error body in contract form')
assert.equal(handle('GET', '/meta', '').status, 200)

/* hotspots CSV: every raw point, exactly inside the polygon, industrial ones included */
const csvRows = mockHotspotsCsv({ aoi: chornobyl, from: '2020-04-01', to: '2020-04-30' }).trim().split('\n').slice(1).map((l) => l.split(','))
const april = res.monthly.find((r) => r.period === '2020-04')!
assert.ok(csvRows.length >= april.modis_raw + april.viirs_raw, 'one row per raw detection or more')
assert.ok(csvRows.some((r) => r[9] === '2'), 'industrial points are in the CSV')
assert.ok(csvRows.every(([lat, lon]) => +lon >= 29.25 && +lon <= 30.65 && +lat >= 51.1 && +lat <= 51.6), 'points inside the area')

/* the 0.1° grid of contract 1 */
assert.equal(cellIdOf(37.612, 47.08959), 4934176, 'contract 1 example')
assert.equal(cellIdOf(31.68034, 45.25808), 4869316, 'contract 1 example, NRT row')
assert.deepEqual(cellBounds(4934176), [37.6, 47, 37.7, 47.1])
assert.equal(cellIdOf(37.65, 47.05), 4934176, 'round trip through the cell centre')

/* GET /grid (mock) */
const ua = PRESETS[3].geometry
const center = (id: number): [number, number] => {
  const [w, s, e, n] = cellBounds(id)
  return [(w + e) / 2, (s + n) / 2]
}
const grid = (from: string, to: string, record: string) => mockGrid(new URLSearchParams({ from, to, record }))
const year2020 = grid('2020-01-01', '2020-12-31', 'harmonized')
assert.ok(year2020.length > 3000, 'cells over Ukraine')
assert.ok(year2020.every((c) => pointInGeometry(...center(c.cell_id), ua)), 'only cells inside the border')
assert.ok(year2020.every((c) => c.count > 0), 'empty cells are left out')
const uaTotal = mockAnalyze({ aoi: ua, from: '2020-01-01', to: '2020-12-31' }).totals.count_h
const gridTotal = year2020.reduce((a, c) => a + c.count, 0)
assert.ok(Math.abs(gridTotal - uaTotal) / uaTotal < 0.01, `grid sums to the area total (${gridTotal} vs ${uaTotal})`)
assert.ok(grid('2020-04-01', '2020-04-30', 'harmonized').reduce((a, c) => a + c.count, 0) < gridTotal, 'a month is less than its year')
assert.equal(grid('2005-01-01', '2005-12-31', 'viirs').length, 0, 'no VIIRS before 2012')
assert.ok(grid('2005-01-01', '2005-12-31', 'modis').length > 0)
assert.equal(err(() => grid('2005-01-01', '2005-12-31', 'noaa20')), '400 invalid_record')
assert.equal(handle('GET', '/grid?from=2021-01-01&to=2020-01-01&record=modis', '').status, 400, 'invalid_range through the router')
assert.ok(JSON.parse(handle('GET', '/grid?from=2020-04-01&to=2020-04-30&record=viirs', '').body).length > 0, 'routed with the query string')

/* series: crop to the period, mask before each sensor starts */
assert.deepEqual([...new Set(cropMonthly(res.monthly, 2015, 2016).map((r) => r.period.slice(0, 4)))], ['2015', '2016'])
assert.equal(cropMonthly(res.monthly, 2015, 2016).length, 24)
assert.match(maskReason('2011-12', 'viirs', meta, '2026-11', 14)!, /VIIRS S-NPP starts in January 2012/)
assert.equal(maskReason('2012-01', 'viirs', meta, '2026-11', 14), null)
assert.match(maskReason('2000-10', 'modis', meta, '2026-11', 14)!, /MODIS starts in November 2000/)
assert.equal(maskReason('2000-11', 'harm', meta, '2026-11', 14), null)
assert.match(maskReason('2026-11', 'harm', meta, '2026-11', 14)!, /Incomplete month: 14 days/)
assert.equal(maskReason('2026-12', 'harm', meta, '2026-11', 14), 'Not observed yet')
const viirsCells = buildCells(res, meta, 'viirs', 2000, 2026)
assert.equal(viirsCells.length, 27 * 12)
assert.equal(viirsCells.find((c) => c.period === '2011-06')!.value, null)
assert.equal(viirsCells.find((c) => c.period === '2012-06')!.value, res.monthly.find((r) => r.period === '2012-06')!.viirs_raw)
assert.equal(buildCells(res, meta, 'harm', 2000, 2000).filter((c) => c.value !== null).length, 2, 'only Nov and Dec 2000')

console.log('selfcheck ok')
