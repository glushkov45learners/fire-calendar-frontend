import { useState } from 'react'
import { isInCoverage, matchPreset, parseLatLon, pointArea, type Area } from '@/entities/aoi'
import { DEFAULT_RADIUS_KM } from '@/shared/config'

type Props = { onSelect: (a: Area) => void }

/** Preset names match as you type, as in the design; "lat, lon" is looked up on Enter, so half-typed numbers send nothing. */
export function SearchArea({ onSelect }: Props) {
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')

  const onInput = (v: string) => {
    setQ(v)
    setNote('')
    if (!v.trim()) return
    if (parseLatLon(v)) return setNote('Press Enter to look up this point.')
    const hit = matchPreset(v)
    if (hit) onSelect(hit)
    else setNote('No saved area matches. Try Chornobyl, Dnipro or Donbas, or type lat, lon.')
  }

  const onSubmit = () => {
    const ll = parseLatLon(q)
    if (!ll) return
    const [lat, lon] = ll
    if (!isInCoverage(lat, lon)) return setNote('That point is outside Ukraine.')
    onSelect(pointArea(lat, lon, DEFAULT_RADIUS_KM))
    setNote(`Showing ${DEFAULT_RADIUS_KM} km around this point.`)
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
        <input type="search" value={q} onChange={(e) => onInput(e.target.value)} placeholder="Find an area, or type lat, lon" autoComplete="off" />
      </label>
      <p className="search-note" aria-live="polite">
        {note}
      </p>
    </form>
  )
}
