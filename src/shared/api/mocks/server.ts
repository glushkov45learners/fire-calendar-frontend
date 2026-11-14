import { mockAnalyze, mockCalendarCsv, MockError, mockGrid, mockHotspotsCsv, mockMeta } from './handlers'

export type MockResponse = { status: number; type: string; body: string; filename?: string }

const json = (status: number, v: unknown): MockResponse => ({ status, type: 'application/json', body: JSON.stringify(v) })

/**
 * Routes one request of contract 3 to the mock handlers; errors come back in the contract's `{ error }` form.
 * `url` is the request path after /api/v1, query string included.
 */
export function handle(method: string, url: string, rawBody: string): MockResponse {
  const [path, query = ''] = url.split('?')
  try {
    let body: unknown
    if (method === 'POST') {
      try {
        body = JSON.parse(rawBody || '{}')
      } catch {
        throw new MockError(400, 'invalid_aoi', 'Request body is not JSON')
      }
    }
    if (method === 'GET' && path === '/meta') return json(200, mockMeta())
    if (method === 'GET' && path === '/grid') return json(200, mockGrid(new URLSearchParams(query)))
    if (method === 'POST' && path === '/analyze') return json(200, mockAnalyze(body))
    if (method === 'POST' && path === '/calendar.csv') return { status: 200, type: 'text/csv', body: mockCalendarCsv(body), filename: 'calendar.csv' }
    if (method === 'POST' && path === '/hotspots.csv') return { status: 200, type: 'text/csv', body: mockHotspotsCsv(body), filename: 'hotspots.csv' }
    return json(404, { error: { code: 'not_found', message: `${method} ${path} is not part of contract 3` } })
  } catch (e) {
    if (e instanceof MockError) return json(e.status, { error: { code: e.code, message: e.message } })
    return json(500, { error: { code: 'internal', message: (e as Error).message } })
  }
}
