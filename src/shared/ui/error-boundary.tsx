import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { fallback: ReactNode | ((error: unknown) => ReactNode); children: ReactNode }

/** Shows `fallback` instead of a subtree that threw while rendering (or whose lazy chunk failed to load). */
export class ErrorBoundary extends Component<Props, { error: unknown }> {
  state = { error: null as unknown }
  static getDerivedStateFromError(error: unknown) {
    return { error }
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }
  render() {
    const { fallback, children } = this.props
    if (this.state.error === null) return children
    return typeof fallback === 'function' ? fallback(this.state.error) : fallback
  }
}
