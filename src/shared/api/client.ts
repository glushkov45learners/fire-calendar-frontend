// Empty VITE_API_URL → same-origin "/api", which the Vite dev proxy forwards to the Go backend.
const BASE_URL = import.meta.env.VITE_API_URL ?? ''
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}
