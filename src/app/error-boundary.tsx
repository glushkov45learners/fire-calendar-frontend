import type { ReactNode } from 'react'
import { useRouteError } from 'react-router'
import { ErrorBoundary as Boundary } from '@/shared/ui/error-boundary'

function Fallback({ error }: { error: unknown }) {
  return (
    <main className="crash" role="alert">
      <h1>Something broke</h1>
      <p>The page hit an error it could not recover from. Reloading usually helps; the view is kept in the address.</p>
      <pre>{error instanceof Error ? error.message : String(error)}</pre>
      <button type="button" className="action is-filled" onClick={() => location.reload()}>
        Reload
      </button>
    </main>
  )
}

/** Last line of defence for render errors outside the router. */
export const ErrorBoundary = ({ children }: { children: ReactNode }) => <Boundary fallback={(e) => <Fallback error={e} />}>{children}</Boundary>

/** Render errors inside the page are caught by the router; show the same screen. */
export function RouteError() {
  return <Fallback error={useRouteError()} />
}
