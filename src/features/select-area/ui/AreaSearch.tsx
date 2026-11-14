import { useState } from 'react'
import { matchRegion, parseLatLon, pointRegion, POINT_RADIUS_KM, type Region } from '@/entities/region'

type Props = { coverage: [number, number, number, number] | null; onSelect: (r: Region) => void }

/** Area names match as you type; a "lat, lon" pair is looked up on Enter, so half-typed numbers don't trigger requests. */
export function AreaSearch({ coverage, onSelect }: Props) {
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')

  const onInput = (v: string) => {
    setQ(v)
    setNote('')
    if (!v.trim()) return
    if (parseLatLon(v)) return setNote('Press Enter to look up this point.')
    const hit = matchRegion(v)
    if (hit) onSelect(hit)
    else setNote('No saved area matches. Try Chornobyl, Dnipro or Donbas, or type lat, lon.')
  }

  const onSubmit = () => {
    const ll = parseLatLon(q)
    if (!ll) return
    const [lat, lon] = ll
    const [w, s, e, n] = coverage ?? [-180, -90, 180, 90]
    if (lat < s || lat > n || lon < w || lon > e) return setNote('That point is outside the coverage (Ukraine).')
    onSelect(pointRegion(lat, lon))
    setNote(`Showing ${POINT_RADIUS_KM} km around this point.`)
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <label className="search">
        <svg viewBox="0 0 18 18" aria-hidden="true">
          <circle cx="8" cy="8" r="5.2" />
          <path d="M12 12l3.5 3.5" />
        </svg>
        <span className="sr-only">Find an area</span>
        <input
          type="search"
          value={q}
          onChange={(e) => onInput(e.target.value)}
          placeholder="Find an area, or type lat, lon"
          autoComplete="off"
        />
      </label>
      <p className="search-note" aria-live="polite">
        {note}
      </p>
    </form>
  )
}
