import { Link } from 'react-router'
import { DEFAULT_REGION, REGION_PRESETS } from '@/entities/region'
import { getCalendar } from '@/shared/api'
import { centroid } from '@/shared/lib/geo'
import { usePrefersReducedMotion } from '@/shared/lib/theme'
import { useAsync } from '@/shared/lib/use-async'
import { Button } from '@/shared/ui/button'
import { DottedMap } from '@/shared/ui/dotted-map'
import { BurnCalendar } from '@/widgets/burn-calendar'
import { SiteHeader } from '@/widgets/site-header'

const TO = new Date().getFullYear()
const FROM = 2000

// The exclusion zone sits inside Ukraine at this scale; one label covers both.
const LABELS: Record<string, string> = { ukraine: 'Ukraine, Chernobyl zone', chilecito: 'Chilecito, Argentina' }
const MARKERS = REGION_PRESETS.map((r) => {
  const [lng, lat] = centroid(r.area)
  return { lat, lng, size: 1, label: LABELS[r.id] }
})

export function HomePage() {
  const reduced = usePrefersReducedMotion()
  const calendar = useAsync(
    () => getCalendar({ area: DEFAULT_REGION.area, source: 'harmonized', from: FROM, to: TO }),
    [],
  )

  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr]">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-360 items-center gap-x-16 gap-y-10 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-16">
        <div className="grid content-center justify-items-start gap-6">
          <h1 className="text-[clamp(3.25rem,6vw+1rem,6.5rem)] leading-[0.98]">Where? When?</h1>
          <p className="text-ink-2 max-w-[34ch] text-xl leading-snug">
            Satellite fire hotspots since 2000, MODIS and VIIRS on one calendar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/explorer">Open the explorer</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/about">How it is harmonized</Link>
            </Button>
          </div>
          <p className="text-ink-3 mt-4 max-w-[46ch] text-sm">
            NASA Space Apps Challenge 2026, for the CONAE challenge on harmonizing MODIS and VIIRS hot spots.
          </p>
        </div>

        <figure className="panel grid gap-4" aria-label="Preset regions and the Ukraine burn calendar">
          <div className="aspect-5/2 min-w-0">
            <DottedMap
              markers={MARKERS}
              pulse={!reduced}
              dotRadius={0.22}
              className="text-rule-2"
              aria-hidden
              renderMarkerOverlay={({ marker, x, y }) =>
                marker.label ? (
                  <text x={x + 1.8} y={y + 0.9} fontSize={2.6} fill="var(--ink-2)">
                    {marker.label}
                  </text>
                ) : null
              }
            />
          </div>
          <BurnCalendar compact cells={calendar.data} from={FROM} to={TO} loading={calendar.loading} />
          <figcaption className="text-ink-3 text-sm">
            Ukraine, harmonized hotspots per month, {FROM} to {TO}: spring field burning and the autumn stubble season.
          </figcaption>
        </figure>
      </main>
    </div>
  )
}
