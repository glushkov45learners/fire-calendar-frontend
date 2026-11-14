import { useSyncExternalStore } from 'react'

export const THEMES = ['kiln', 'console'] as const
export type Theme = (typeof THEMES)[number]

const root = () => document.documentElement

export function getTheme(): Theme {
  return root().dataset.theme === 'console' ? 'console' : 'kiln'
}

export function setTheme(t: Theme) {
  root().dataset.theme = t
  try {
    localStorage.setItem('theme', t)
  } catch {
    // private mode: the choice just doesn't persist
  }
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb)
  mo.observe(root(), { attributes: true, attributeFilter: ['data-theme'] })
  return () => mo.disconnect()
}

/** Current theme; re-renders when it changes (e.g. to re-read CSS tokens into canvas libraries). */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme)
}

/** Resolved value of a CSS custom property on <html>, for libraries that can't read var(). */
export function cssVar(name: string): string {
  return getComputedStyle(root()).getPropertyValue(name).trim()
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = matchMedia('(prefers-reduced-motion: reduce)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
}
