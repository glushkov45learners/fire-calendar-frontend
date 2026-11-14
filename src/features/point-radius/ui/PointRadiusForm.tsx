import { useState, type FormEvent } from 'react'
import { isInCoverage, pointArea, type Area } from '@/entities/aoi'
import { DEFAULT_RADIUS_KM, MAX_ABS_LAT, MAX_RADIUS_KM } from '@/shared/config'

const FIELDS = [
  { name: 'lat', label: 'Latitude', min: -MAX_ABS_LAT, max: MAX_ABS_LAT, step: 'any', placeholder: '51.39' },
  { name: 'lon', label: 'Longitude', min: -180, max: 180, step: 'any', placeholder: '30.10' },
  { name: 'km', label: 'Radius, km', min: 1, max: MAX_RADIUS_KM, step: '1', placeholder: String(DEFAULT_RADIUS_KM) },
] as const

/** An area as a circle around a point, for coordinates that come from a report rather than the map. */
export function PointRadiusForm({ onSubmit }: { onSubmit: (a: Area) => void }) {
  const [error, setError] = useState('')

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    // An empty radius means the default; empty coordinates are an error.
    const value = (name: string) => String(data.get(name) ?? '').trim() || (name === 'km' ? String(DEFAULT_RADIUS_KM) : '')
    const bad = FIELDS.find((f) => {
      const n = Number(value(f.name))
      return value(f.name) === '' || !Number.isFinite(n) || n < f.min || n > f.max
    })
    if (bad) return setError(`${bad.label} must be between ${bad.min} and ${bad.max}.`)
    const lat = Number(value('lat'))
    const lon = Number(value('lon'))
    if (!isInCoverage(lat, lon)) return setError('That point is outside Ukraine.')
    setError('')
    onSubmit(pointArea(lat, lon, Number(value('km'))))
  }

  return (
    <form className="point-form" onSubmit={submit} noValidate aria-label="Area by point and radius">
      <div className="fields">
        {FIELDS.map((f) => (
          <label key={f.name} className="field">
            <span>{f.label}</span>
            <input
              name={f.name}
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.step}
              placeholder={f.placeholder}
              aria-invalid={error.startsWith(f.label) || undefined}
            />
          </label>
        ))}
      </div>
      <button type="submit" className="action">
        Set area
      </button>
      {error && (
        <p className="hint is-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
