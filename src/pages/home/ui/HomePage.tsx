import type { Polygon } from 'geojson'
import { useState } from 'react'
import { getFireStats, type FireStat } from '@/shared/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { FireChart } from '@/widgets/fire-chart'
import { FireMap } from '@/widgets/fire-map'

export function HomePage() {
  const [stats, setStats] = useState<FireStat[]>([])
  const [error, setError] = useState<string | null>(null)

  const onAreaChange = (area: Polygon | null) => {
    setError(null)
    if (!area) return setStats([])
    getFireStats(area).then(setStats, (e: Error) => setError(e.message))
  }

  return (
    <main className="grid h-svh grid-rows-[1fr_auto] gap-4 p-4">
      <div className="overflow-hidden rounded-xl border">
        <FireMap onAreaChange={onAreaChange} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Статистика по области</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : stats.length ? (
            <FireChart data={stats} />
          ) : (
            <p className="text-muted-foreground text-sm">Нарисуйте полигон на карте.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
