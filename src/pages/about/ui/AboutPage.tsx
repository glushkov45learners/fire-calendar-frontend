import { Link } from 'react-router'
import { Button } from '@/shared/ui/button'
import { SiteHeader } from '@/widgets/site-header'

const SOURCES = [
  {
    name: 'NASA FIRMS',
    href: 'https://firms.modaps.eosdis.nasa.gov/',
    what: 'Fire Information for Resource Management System, the archive and near-real-time feed of both sensors.',
  },
  {
    name: 'MODIS active fires, Collection 6.1',
    href: 'https://www.earthdata.nasa.gov/data/instruments/modis',
    what: 'Terra since November 2000, Aqua since July 2002, 1 km pixels.',
  },
  {
    name: 'VIIRS 375 m active fires',
    href: 'https://www.earthdata.nasa.gov/data/instruments/viirs',
    what: 'S-NPP since January 2012, then NOAA-20 and NOAA-21.',
  },
]

export function AboutPage() {
  return (
    <div className="min-h-svh">
      <SiteHeader />
      <main className="mx-auto grid max-w-[1200px] gap-14 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
        <article className="grid content-start gap-10">
          <h1 className="text-[clamp(2.5rem,3vw+1.5rem,4rem)]">How the series is harmonized</h1>

          <section className="grid gap-3">
            <h2 className="text-2xl">Two sensors, one record</h2>
            <p className="text-ink-2 max-w-[62ch]">
              MODIS sees fire at 1 km. VIIRS sees it at 375 m, so it catches smaller fires and reports several times more
              hotspots over the same ground. Joined as they are, the record jumps in 2012 and again with each new
              satellite.
            </p>
          </section>

          <section className="grid gap-3">
            <h2 className="text-2xl">The method</h2>
            <p className="text-ink-2 max-w-[62ch]">
              From 2012 both sensors watched the same fires. For each region and calendar month we fit the ratio between
              their counts over that overlap and express VIIRS detections in MODIS-equivalent counts. The harmonized series
              is one continuous scale from 2000 to today, so an April in 2004 and an April in 2024 can be compared.
            </p>
          </section>

          <section className="grid gap-3">
            <h2 className="text-2xl">What a count means</h2>
            <p className="text-ink-2 max-w-[62ch]">
              A hotspot is a pixel hotter than its surroundings at the moment of an overpass: not a fire, and not burned
              area. Cloud and smoke hide fires, so a quiet month can be a cloudy one. Read the calendar as detections
              against the median, not as hectares.
            </p>
          </section>

          <Button asChild size="lg" className="justify-self-start">
            <Link to="/explorer">Open the explorer</Link>
          </Button>
        </article>

        <aside className="grid content-start gap-4" aria-labelledby="sources">
          <h2 id="sources" className="text-2xl">
            Sources
          </h2>
          <ul className="panels grid gap-(--gap-panel)">
            {SOURCES.map((s) => (
              <li key={s.name} className="panel grid gap-1">
                <a href={s.href} className="text-ink font-medium underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                  {s.name}
                </a>
                <p className="text-ink-3 text-sm">{s.what}</p>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  )
}
