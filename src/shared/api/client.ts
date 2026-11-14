// Empty VITE_API_URL → same origin (contract 3: nginx proxies /api to the backend; in dev Vite does).
const BASE_URL = import.meta.env.VITE_API_URL ?? ''
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/** Contract 3 error: `{ error: { code, message } }`, e.g. invalid_aoi, invalid_range, outside_coverage, too_many_rows. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

async function send(path: string, body?: unknown): Promise<Response> {
  const res = await fetch(
    `${BASE_URL}/api/v1${path}`,
    body === undefined
      ? undefined
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (res.ok) return res
  let code = `http_${res.status}`
  let message = res.statusText
  try {
    const j = (await res.json()) as { error?: { code?: string; message?: string } }
    code = j.error?.code ?? code
    message = j.error?.message ?? message
  } catch {
    // not a contract error body (proxy page, empty 502): keep the HTTP status
  }
  throw new ApiError(code, message, res.status)
}

export const getJson = <T>(path: string, body?: unknown) => send(path, body).then((r) => r.json() as Promise<T>)
export const getBlob = (path: string, body: unknown) => send(path, body).then((r) => r.blob())
