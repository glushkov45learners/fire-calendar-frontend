import { Link, NavLink } from 'react-router'
import { ThemeSwitcher } from '@/features/switch-theme'
import { cn } from '@/shared/lib/utils'

const LINKS = [
  { to: '/explorer', label: 'Explorer' },
  { to: '/about', label: 'Method' },
]

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'border-rule flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-2 sm:px-6',
        className,
      )}
    >
      <Link to="/" className="font-display mr-auto text-lg tracking-tight no-underline">
        Burn calendar
      </Link>
      <nav aria-label="Main">
        <ul className="flex gap-1">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-(--ctl-h) items-center rounded-(--radius) px-3 text-sm no-underline transition-colors duration-(--dur-short)',
                    isActive ? 'bg-paper-3 text-ink' : 'text-ink-3 hover:text-ink',
                  )
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ThemeSwitcher />
    </header>
  )
}
