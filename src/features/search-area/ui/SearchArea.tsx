import { useState } from 'react'
import { isInCoverage, parseLatLon, pointArea, searchAreas, type Area } from '@/entities/aoi'
import { DEFAULT_RADIUS_KM } from '@/shared/config'

type Props = { onSelect: (a: Area) => void }

/**
 * Saved areas (the four presets, every oblast, Crimea, Kyiv and Sevastopol) match as you type: a single match is shown at once,
 * several are listed to pick from, and Enter takes the first. "lat, lon" is looked up on Enter, so half-typed numbers send nothing.
 */
export function SearchArea({ onSelect }: Props) {
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [hits, setHits] = useState<Area[]>([])

  const pick = (a: Area) => {
    onSelect(a)
    setHits([])
    setNote(`Showing ${a.name}.`)
  }

  const onInput = (v: string) => {
    setQ(v)
    setNote('')
    setHits([])
    if (!v.trim()) return
    if (parseLatLon(v)) return setNote('Press Enter to look up this point.')
    const found = searchAreas(v)
    if (found.length === 1) pick(found[0])
    else if (found.length) setHits(found)
    else setNote('No area matches. Try an oblast, Kyiv, Chornobyl or Donbas, or type lat, lon.')
  }

  const onSubmit = () => {
    const ll = parseLatLon(q)
    if (!ll) {
      if (hits.length) pick(hits[0])
      return
    }
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
        <input type="search" value={q} onChange={(e) => onInput(e.target.value)} placeholder="Find an oblast or area, or type lat, lon" autoComplete="off" />
      </label>
      {hits.length > 0 && (
        <ul className="search-hits" aria-label="Matching areas">
          {hits.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => pick(a)}>
                {a.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="search-note" aria-live="polite">
        {note}
      </p>
    </form>
  )
}
