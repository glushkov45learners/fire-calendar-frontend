import { REGION_PRESETS, type Region } from '@/entities/region'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export const CUSTOM_AREA = 'custom'

type Props = { value: string; onChange: (region: Region) => void }

/** `value` is a preset id, or CUSTOM_AREA once the user drew or typed their own area. */
export function RegionPresetSelect({ value, onChange }: Props) {
  const pick = (id: string) => {
    const r = REGION_PRESETS.find((p) => p.id === id)
    if (r) onChange(r)
  }
  return (
    <Select value={value} onValueChange={pick}>
      <SelectTrigger aria-label="Region" className="min-w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REGION_PRESETS.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            {r.name}
          </SelectItem>
        ))}
        {value === CUSTOM_AREA && (
          <SelectItem value={CUSTOM_AREA} disabled>
            Custom area
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
