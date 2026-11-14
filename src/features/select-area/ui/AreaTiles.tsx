import { REGION_PRESETS, type Region } from '@/entities/region'
import { fmt } from '@/shared/lib/format'
import { areaKm2, bbox } from '@/shared/lib/geo'

type Props = { value: Region; onSelect: (r: Region) => void }

export function AreaTiles({ value, onSelect }: Props) {
  const [w, s, e, n] = bbox(value.aoi)
  return (
    <>
      <div className="tiles">
        {REGION_PRESETS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={r.id === value.id ? 'tile is-on' : 'tile'}
            aria-pressed={r.id === value.id}
            onClick={() => onSelect(r)}
          >
            <b>{r.short}</b>
            <span>{fmt(r.km2 ?? areaKm2(r.aoi))} km²</span>
          </button>
        ))}
      </div>
      <dl className="bounds">
        {(
          [
            ['N', n],
            ['S', s],
            ['W', w],
            ['E', e],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v.toFixed(2)}°</dd>
          </div>
        ))}
      </dl>
    </>
  )
}
