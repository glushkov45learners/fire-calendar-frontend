import type { Polygon } from 'geojson'
import { useState, type FormEvent } from 'react'
import { circlePolygon } from '@/shared/lib/geo'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const FIELDS = [
  // ±80 plus a 500 km radius (~4.5°) stays inside the map's ±85° range; beyond it MapLibre throws.
  { name: 'lat', label: 'Latitude', min: -80, max: 80, step: 'any', placeholder: '50.45' },
  { name: 'lon', label: 'Longitude', min: -180, max: 180, step: 'any', placeholder: '30.52' },
  { name: 'km', label: 'Radius, km', min: 1, max: 500, step: '1', placeholder: '25' },
] as const

/** Area as a circle around a point, for when the coordinates come from a report, not the map. */
export function CoordinatesForm({ onSubmit }: { onSubmit: (area: Polygon) => void }) {
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const raw = (name: string) => String(data.get(name) ?? '').trim()
    const bad = FIELDS.find((f) => {
      const n = Number(raw(f.name))
      return raw(f.name) === '' || !Number.isFinite(n) || n < f.min || n > f.max
    })
    if (bad) return setError(`${bad.label} must be between ${bad.min} and ${bad.max}.`)
    setError(null)
    onSubmit(circlePolygon(Number(raw('lat')), Number(raw('lon')), Number(raw('km'))))
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-2" aria-label="Area by coordinates">
      <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] [&>button]:max-sm:col-span-3">
        {FIELDS.map((f) => (
          <div key={f.name} className="grid min-w-0 gap-1.5">
            <Label htmlFor={`area-${f.name}`} className="text-ink-3 text-xs font-medium">
              {f.label}
            </Label>
            <Input
              id={`area-${f.name}`}
              name={f.name}
              type="number"
              inputMode="decimal"
              min={f.min}
              max={f.max}
              step={f.step}
              placeholder={f.placeholder}
              aria-invalid={error?.startsWith(f.label) || undefined}
              className="num"
            />
          </div>
        ))}
        <Button type="submit" variant="outline">
          Set area
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
