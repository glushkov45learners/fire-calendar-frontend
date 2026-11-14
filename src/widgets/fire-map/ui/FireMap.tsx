import 'maplibre-gl/dist/maplibre-gl.css'
import type { Polygon } from 'geojson'
import Map, { NavigationControl } from 'react-map-gl/maplibre'
import { DrawAreaControl } from '@/features/draw-area'

export function FireMap({ onAreaChange }: { onAreaChange: (area: Polygon | null) => void }) {
  return (
    <Map
      initialViewState={{ longitude: 37.6, latitude: 55.75, zoom: 4 }}
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      style={{ width: '100%', height: '100%' }}
    >
      <NavigationControl position="top-right" />
      <DrawAreaControl onChange={onAreaChange} />
    </Map>
  )
}
