import { useEffect, useState, type DependencyList } from 'react'

type State<T> = { data: T | null; error: Error | null; loading: boolean }

/** Runs `fn` whenever `deps` change; drops results of superseded calls. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, error: null, loading: true }))
    fn().then(
      (data) => live && setState({ data, error: null, loading: false }),
      (error: Error) => live && setState({ data: null, error, loading: false }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  return { ...state, retry: () => setAttempt((n) => n + 1) }
}
