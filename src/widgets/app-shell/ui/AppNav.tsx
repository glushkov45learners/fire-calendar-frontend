import { useEffect, useState } from 'react'

const SECTIONS = [
  { id: 'top', label: 'Map', icon: 'M2.5 5.5l5-2 5 2 5-2v11l-5 2-5-2-5 2zM7.5 3.5v11M12.5 5.5v11' },
  { id: 'calendar', label: 'Calendar', icon: 'M2.5 4.5h15v12h-15zM2.5 8h15M7.5 8v8.5M12.5 8v8.5M2.5 12.2h15' },
  { id: 'month', label: 'Month', icon: 'M2.5 15.5h15M5 15.5v-5M8.3 15.5v-9M11.6 15.5v-3M15 15.5V4' },
  { id: 'sensors', label: 'Sensors', icon: 'M2.5 14.5l4-4 3 2 3.5-6 4.5 3' },
] as const

type Props = { collapsed: boolean; onToggle: () => void }

export function AppNav({ collapsed, onToggle }: Props) {
  const [active, setActive] = useState<string>('top')

  // The section crossing the upper third of the viewport is the one being read.
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), {
      rootMargin: '-30% 0px -60% 0px',
    })
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  return (
    <aside className="side" aria-label="Sections">
      <a className="brand" href="#top" aria-label="Fire Calendar">
        <BrandMark />
        <span className="lbl">Fire Calendar</span>
      </a>
      <nav>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={active === s.id ? 'nav-item is-active' : 'nav-item'}
            aria-current={active === s.id ? 'location' : undefined}
            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d={s.icon} />
            </svg>
            <span className="lbl">{s.label}</span>
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <a className="nav-item" href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <ellipse cx="10" cy="5.5" rx="6.5" ry="2.5" />
            <path d="M3.5 5.5v9c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-9M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" />
          </svg>
          <span className="lbl">Data source</span>
        </a>
        <button type="button" className="nav-item collapse-btn" aria-expanded={!collapsed} onClick={onToggle}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect x="2.5" y="3.5" width="15" height="13" rx="1" />
            <path d="M7.5 3.5v13M13.5 8l-2.5 2 2.5 2" />
          </svg>
          <span className="lbl">{collapsed ? 'Expand menu' : 'Collapse menu'}</span>
        </button>
      </div>
    </aside>
  )
}

function BrandMark() {
  const o = [0.2, 0.45, 0.2, 0.45, 1, 0.7, 0.2, 0.45, 0.2]
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {o.map((op, i) => (
        <rect key={i} x={(i % 3) * 7.5} y={Math.floor(i / 3) * 7.5} width="5" height="5" fill="#f0f0fa" opacity={op} />
      ))}
    </svg>
  )
}
