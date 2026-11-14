import { PRESETS, type Area } from '@/entities/aoi'
import { fmt } from '@/shared/lib/format'
import { areaKm2, bbox } from '@/shared/lib/geo'

type Props = { value: Area; onSelect: (a: Area) => void }

/** The four saved areas of the design, and the bounds of whatever area is selected. */
export function PresetTiles({ value, onSelect }: Props) {
  const [w, s, e, n] = bbox(value.geometry)
  const bounds = [
    ['N', n],
    ['S', s],
    ['W', w],
    ['E', e],
  ] as const
  return (
    <>
      <div className="tiles">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className={p.id === value.id ? 'tile is-on' : 'tile'} aria-pressed={p.id === value.id} onClick={() => onSelect(p)}>
            <b>{p.short}</b>
            <span>{fmt(areaKm2(p.geometry))} km²</span>
          </button>
        ))}
      </div>
      <dl className="bounds" aria-label={`Bounds of ${value.name}`}>
        {bounds.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v.toFixed(2)}°</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
