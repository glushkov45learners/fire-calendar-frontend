// Browser checks of the whole page, driven over the Chrome DevTools Protocol. No extra dependencies.
//
//   npm run e2e
//
// Starts its own Vite dev server on E2E_PORT (default 5179) with the contract-3 mocks (VITE_USE_MOCKS=true in .env.development),
// unless E2E_URL points at a running app. The expectations assume the mock data (e.g. Chornobyl, April 2020 is "extreme").
// Chrome: CHROME_PATH, or the default install location. Screenshots go to screenshots/ (git-excluded); downloads and the
// browser profile to the OS temp folder. Exit code 1 if any check fails.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SHOTS = join(ROOT, 'screenshots')
const TMP = join(tmpdir(), 'fire-calendar-e2e')
const DL = join(TMP, 'downloads')
const PORT = Number(process.env.E2E_PORT ?? 5179)
const CDP_PORT = 9333
const CHROME =
  process.env.CHROME_PATH ??
  {
    win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  }[process.platform] ??
  'google-chrome'

rmSync(TMP, { recursive: true, force: true })
mkdirSync(DL, { recursive: true })
mkdirSync(SHOTS, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ───────── app server ───────── */

let vite = null
let BASE = process.env.E2E_URL
if (!BASE) {
  const { createServer } = await import('vite')
  vite = await createServer({ root: ROOT, mode: 'development', server: { port: PORT, strictPort: true }, logLevel: 'warn' })
  await vite.listen()
  BASE = `http://localhost:${PORT}`
}

/* ───────── browser ───────── */

if (CHROME.includes('/') && !existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`)
  process.exit(2)
}
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${join(TMP, 'profile')}`, '--window-size=1440,1000', 'about:blank'])
let page
for (let i = 0; i < 75 && !page; i++) {
  try {
    page = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page')
  } catch {
    await sleep(200)
  }
}
if (!page) throw new Error('Chrome did not open a DevTools port')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
const errors = []
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text)
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '))
}
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r)
    ws.send(JSON.stringify({ id, method, params }))
  })
const ev = async (body) => {
  const r = await send('Runtime.evaluate', { expression: `(async()=>{${body}})()`, awaitPromise: true, returnByValue: true })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description)
  return r.result?.result?.value
}
const waitFor = async (expr, ms = 8000) => {
  for (const t = Date.now(); Date.now() - t < ms; await sleep(150)) if (await ev(`return !!(${expr})`).catch(() => false)) return true
  return false
}
/** Open a path and wait until "In this selection" has numbers (i.e. /analyze answered). */
const goto = async (path) => {
  await send('Page.navigate', { url: BASE + path })
  await sleep(300)
  await waitFor(`document.querySelector('.panel .spec dd') && !document.querySelector('.panel .spec dd').textContent.includes('…')`, 10000)
  await sleep(500)
}
const shot = async (name, full = false) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full })
  writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.result.data, 'base64'))
}
const text = (sel) => ev(`return document.querySelector(${JSON.stringify(sel)})?.textContent ?? ''`)
const search = () => ev(`return location.search`)
const summary = () => ev(`return [...document.querySelectorAll('.panel .spec div')].map(d => d.querySelector('dt').textContent + ': ' + d.querySelector('dd').textContent).join(' | ')`)
const cellsInfo = () => ev(`return { data: document.querySelectorAll('.cal rect.c:not(.nd)').length, nd: document.querySelectorAll('.cal rect.nd').length }`)
const hover = (p) => ev(`const r=document.querySelector('.cal rect[data-p="${p}"]'); const b=r.getBoundingClientRect(); r.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,clientX:b.x+2,clientY:b.y+2}))`)
const clickButton = (label) => ev(`[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(label)})).click()`)
const typeSearch = (v) =>
  ev(`const i=document.querySelector('.search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i, ${JSON.stringify(v)}); i.dispatchEvent(new Event('input',{bubbles:true}))`)
const key = (k) => ev(`document.querySelector('.cal').dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(k)},bubbles:true}))`)

const results = []
const check = (name, ok, info = '') => results.push({ ok: !!ok, line: `${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  — ${info}` : ''}` })

await send('Runtime.enable')
await send('Page.enable')
await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL })
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

try {
  /* presets, and the lazily loaded map */
  for (const a of ['chornobyl', 'kherson', 'donbas', 'ua']) {
    await goto(`/?area=${a}`)
    const c = await cellsInfo()
    const s = await summary()
    const alert = await text('.alert')
    check(`preset ${a}`, !alert && c.data > 300 && /km²/.test(s), `${await text('.opening h1')}; ${s}`)
    if (a === 'chornobyl') {
      check('map chunk loads and draws a canvas', await waitFor(`document.querySelector('.map canvas.maplibregl-canvas')`, 15000))
      await sleep(800)
      await shot('desktop-chornobyl')
    }
  }

  /* records and modes */
  await goto('/?area=chornobyl&record=viirs')
  let c = await cellsInfo()
  const anomDisabled = await ev(`return [...document.querySelectorAll('.seg button')].find(b => b.textContent === 'Anomaly').disabled`)
  check('VIIRS: no data before 2012-01, Anomaly disabled with a reason', c.nd >= 134 && anomDisabled && (await text('.panel')).includes('Anomaly is shown for the harmonized record only'), `no-data cells ${c.nd}`)
  await goto('/?area=chornobyl&record=modis')
  c = await cellsInfo()
  check('MODIS: no data only before 2000-11 and from the current month', c.nd === 12, `no-data cells ${c.nd}`)
  await goto('/?area=chornobyl&record=viirs&mode=anom')
  check('raw record with mode=anom falls back to Detections', await ev(`return [...document.querySelectorAll('.seg button')].find(b => b.textContent === 'Detections').getAttribute('aria-pressed') === 'true'`))
  await goto('/?area=chornobyl&mode=anom')
  const fills = await ev(`return new Set([...document.querySelectorAll('.cal rect.c:not(.nd)')].map(r => r.getAttribute('fill'))).size`)
  check('harmonized Anomaly: diverging scale by z', /z-score/.test(await text('.cal-key span')) && fills > 50, `${fills} colours`)
  await shot('desktop-anomaly')

  /* tooltips */
  await hover('2020-04')
  await sleep(200)
  const tip = await text('.tip')
  check('tooltip: month, count_h, median, ratio, percentile, class', /Apr 2020/.test(tip) && /Median/.test(tip) && /percentile/.test(tip) && /extreme|high|normal|low/.test(tip), tip)
  await goto('/?area=chornobyl&record=modis')
  await hover('2020-04')
  await sleep(200)
  check('tooltip in MODIS mode: raw values', /MODIS \d/.test(await text('.tip')), await text('.tip'))

  /* choosing a month; periods */
  await goto('/?area=chornobyl&from=2020&to=2022')
  await ev(`document.querySelector('.cal rect[data-p="2020-04"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`)
  await waitFor(`location.search.includes('month=2020-04') && document.querySelectorAll('.daily rect').length > 0`)
  await waitFor(`/Showing \\d/.test(document.querySelector('.points-key')?.textContent ?? '')`, 10000)
  const bars = await ev(`return document.querySelectorAll('.daily rect').length`)
  const pk = await text('.points-key')
  check('click chooses the month: URL, This month, days, map points', bars === 30 && (await text('#month-h')) === 'April 2020' && /Showing [\d,]+ of [\d,]+ hotspots, Apr 2020/.test(pk), `${bars} days; ${pk}`)
  await sleep(800)
  await shot('desktop-april-2020', true)
  await goto('/?area=chornobyl&from=2010&to=2026')
  check('period over 3 years: hint to narrow it', (await text('#month')).includes('Narrow the period to 3 years to see days'))

  /* This month */
  await goto('/?area=ua')
  const tm = await text('#month')
  check('This month: current_month, "14 of 30 days"', /November 2026/.test(tm) && /14 of 30 days/.test(tm))
  check('strip shows the p25–p75 corridor', await ev(`return !!document.querySelector('.strip rect')`))
  await goto('/?area=chornobyl&month=2003-01')
  const m3 = await text('#month .spec')
  check('small median: absolute difference instead of ratio', /Difference/.test(m3) && !/Ratio to median/.test(m3), m3)

  /* keyboard */
  await goto('/?area=chornobyl&from=2018&to=2020')
  await ev(`document.querySelector('.cal rect[tabindex="0"]').focus()`)
  const before = await ev(`return document.activeElement.dataset.p`)
  await key('ArrowUp')
  await key('ArrowLeft')
  const after = await ev(`return document.activeElement.dataset.p`)
  await key('Enter')
  await waitFor(`location.search.includes('month=${after}')`, 2000)
  check('arrows move between cells, Enter chooses', before !== after && (await search()).includes(`month=${after}`), `${before} → ${after}`)
  check('skip link to the calendar', await ev(`return document.querySelector('a.skip-link')?.getAttribute('href') === '#calendar'`))

  /* search */
  await goto('/')
  await typeSearch('10, 10')
  await ev(`document.querySelector('form[role=search]').requestSubmit()`)
  await sleep(300)
  check('a point outside Ukraine is not sent', (await text('.search-note')) === 'That point is outside Ukraine.' && !(await search()).includes('10%2C10'))
  await typeSearch('donbas')
  await sleep(300)
  check('search by area name', (await search()).includes('area=donbas'))
  await typeSearch('50.45, 30.52')
  await ev(`document.querySelector('form[role=search]').requestSubmit()`)
  // The URL changes before React re-renders the heading: wait for both.
  const pointShown = await waitFor(`location.search.includes('area=50.45%2C30.52%2C25') && /° N/.test(document.querySelector('.opening h1').textContent)`)
  check('"lat, lon" → 25 km around the point', pointShown, `${await search()}; ${await text('.opening h1')}`)

  /* point and radius */
  await goto('/')
  await ev(`document.querySelector('details.more').open = true`)
  const field = (n, v) => ev(`document.querySelector('.point-form input[name=${n}]').value = ${JSON.stringify(v)}`)
  await field('lat', '89')
  await field('lon', '30')
  await ev(`document.querySelector('.point-form').requestSubmit()`)
  await sleep(200)
  check('point form: latitude limited to ±80', (await text('.point-form')).includes('Latitude must be between -80 and 80'))
  await field('lat', '46.6')
  await field('lon', '32.6')
  await field('km', '40')
  await ev(`document.querySelector('.point-form').requestSubmit()`)
  await waitFor(`location.search.includes('46.6%2C32.6%2C40')`)
  await sleep(1000)
  check('point form sets a 40 km area', (await search()).includes('area=46.6%2C32.6%2C40') && !(await text('.alert')))

  /* downloads and the 413 */
  await goto('/?area=ua&from=2000&to=2026')
  await clickButton('Raw hotspots CSV')
  check('413 → "narrow the period or the area"', await waitFor(`document.body.textContent.includes('Over 500,000 points. Narrow the period or the area')`, 15000))
  await goto('/?area=chornobyl&from=2020&to=2020')
  await clickButton('Calendar CSV')
  await clickButton('Raw hotspots CSV')
  await sleep(3000)
  const files = readdirSync(DL)
  check('Calendar CSV and Raw hotspots CSV download as files', files.some((f) => f.includes('_month_')) && files.some((f) => f.includes('_hotspots_')), files.join(', '))

  /* old routes */
  for (const path of ['/explorer', '/about']) {
    await send('Page.navigate', { url: BASE + path })
    await sleep(1200)
    check(`${path} redirects to /`, (await ev(`return location.pathname`)) === '/')
  }

  /* sensors */
  await goto('/?area=ua')
  const sens = await text('#sensors')
  check(
    'Sensors: 3 lines, 2002 and 2012 marks, NOAA and type 2/3 notes, model metrics',
    /Aqua joins Terra/.test(sens) && /VIIRS S-NPP begins/.test(sens) && /NOAA-20 and NOAA-21/.test(sens) && /type 2 and 3/.test(sens) && /MAPE/.test(sens) && /Bias/.test(sens) && (await ev(`return document.querySelectorAll('#sensors .lines path[stroke-linejoin]').length`)) === 3,
  )

  /* collapsed menu, phone */
  await ev(`document.querySelector('.collapse-btn').click()`)
  await sleep(1200)
  await shot('desktop-collapsed')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await goto('/?area=chornobyl')
  const overflow = await ev(`return document.documentElement.scrollWidth - window.innerWidth`)
  check('390 px: no horizontal scroll', overflow <= 0, `${overflow}px`)
  await shot('mobile-390', true)

  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' || '))
} catch (e) {
  check('run finished', false, e.message)
} finally {
  ws.close()
  chrome.kill()
  await vite?.close()
}

console.log(results.map((r) => r.line).join('\n'))
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed. Screenshots: ${SHOTS}`)
process.exit(failed ? 1 : 0)
