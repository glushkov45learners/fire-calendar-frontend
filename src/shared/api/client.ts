import type { ApiErrorBody } from './types'

// Same origin as the app (contract 3): nginx proxies /api in production, Vite in dev.
// `?.` lets node (scripts/selfcheck.ts) load this module, where Vite's env is absent.
const BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1'
export const USE_MOCKS = import.meta.env?.VITE_USE_MOCKS === 'true'

/** `{ error: { code, message } }` of contract 3, or a transport failure (code `network`, status 0). */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function send(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  let res: Response
  try {
    res = await fetch(
      `${BASE_URL}${path}`,
      body === undefined
        ? { signal }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal },
    )
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError('network', (e as Error).message, 0)
  }
  if (res.ok) return res
  let code = `http_${res.status}`
  let message = res.statusText
  try {
    const j = (await res.json()) as Partial<ApiErrorBody>
    code = j.error?.code ?? code
    message = j.error?.message ?? message
  } catch {
    // not a contract error body (proxy page, empty 502): keep the HTTP status
  }
  throw new ApiError(code, message, res.status)
}

export const getJson = <T>(path: string, body?: unknown, signal?: AbortSignal) =>
  send(path, body, signal).then((r) => r.json() as Promise<T>)
/** For endpoints that answer 204: resolves once the server has accepted the body. */
export const post = (path: string, body: unknown, signal?: AbortSignal) => send(path, body, signal).then(() => undefined)
export const getBlob =(path: string, body: unknown, signal?: AbortSignal) => send(path, body, signal).then((r) => r.blob())
