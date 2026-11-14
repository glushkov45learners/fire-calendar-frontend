import { SOURCES, type Source } from '@/entities/hotspot'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

export function SourceToggle({ value, onChange }: { value: Source; onChange: (s: Source) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      // Radix sends an empty value when the active item is clicked again; a source stays selected.
      onValueChange={(v) => v && onChange(v as Source)}
      aria-label="Data source"
    >
      {SOURCES.map((s) => (
        <ToggleGroupItem
          key={s.id}
          value={s.id}
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {s.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
