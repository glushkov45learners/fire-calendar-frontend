import { setTheme, THEMES, useTheme, type Theme } from '@/shared/lib/theme'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

const LABEL: Record<Theme, string> = { kiln: 'Kiln', console: 'Console' }

/** Lets the team compare both visual directions on one deploy. Neutral on purpose: the signal colour is for data filters. */
export function ThemeSwitcher() {
  const theme = useTheme()
  return (
    <div className="flex items-center gap-2">
      <span id="theme-label" className="text-ink-3 text-xs max-sm:sr-only">
        Direction
      </span>
      <ToggleGroup
        type="single"
        size="sm"
        spacing={0}
        variant="outline"
        value={theme}
        onValueChange={(v) => v && setTheme(v as Theme)}
        aria-labelledby="theme-label"
      >
        {THEMES.map((t) => (
          <ToggleGroupItem
            key={t}
            value={t}
            className="text-ink-3 data-[state=on]:bg-paper-3 data-[state=on]:text-ink"
          >
            {LABEL[t]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
