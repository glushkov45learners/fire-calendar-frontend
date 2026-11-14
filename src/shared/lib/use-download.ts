import { useState } from 'react'
import { saveBlob } from './save-blob'

/** Runs a download, tracking busy state and keeping the failure for display. */
export function useDownload(describe: (e: unknown) => string) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (get: () => Promise<Blob>, filename: string) => {
    setBusy(true)
    setError('')
    try {
      saveBlob(await get(), filename)
    } catch (e) {
      setError(describe(e))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

/** File-name-safe slug. */
export const slug = (s: string) => s.toLowerCase().replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '')
