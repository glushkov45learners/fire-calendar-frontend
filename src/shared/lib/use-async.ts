import { useEffect, useState, type DependencyList } from 'react'

type State<T> = { data: T | null; error: Error | null; loading: boolean }

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/**
 * Runs `fn` whenever `deps` change, after `debounceMs` of quiet. The previous call is aborted through its signal,
 * and its result is dropped even if it ignores the signal. `fn` returning null means "nothing to run yet".
 * The last data stays visible while the next call loads.
 */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T> | null, deps: DependencyList, debounceMs = 0) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    let live = true
    setState((s) => ({ ...s, error: null, loading: true }))
    const timer = setTimeout(() => {
      const p = fn(ctrl.signal)
      if (!p) return
      p.then(
        (data) => live && setState({ data, error: null, loading: false }),
        (error: Error) => live && !isAbort(error) && setState((s) => ({ data: s.data, error, loading: false })),
      )
    }, debounceMs)
    return () => {
      live = false
      clearTimeout(timer)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}
