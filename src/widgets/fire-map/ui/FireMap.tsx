import { useEffect, useRef } from 'react'
import type { Region } from '@/entities/region'
import { fmt } from '@/shared/lib/format'
import { bbox } from '@/shared/lib/geo'
import { gradient, ramp, SEQ } from '@/shared/lib/ramp'
import map from '../model/ukraine-map.json'

// shortcut: the base layer is a static snapshot of all-time MODIS detections per 0.1° cell (base-36 levels, baked from the mockup);
// switch to a tile or grid endpoint if the backend ever serves one.
const [BW, BS, BE, BN] = map.bbox
const VW = 1226
const VH = 850
const px = (lon: number) => ((lon - BW) / (BE - BW)) * VW
const py = (lat: number) => ((BN - lat) / (BN - BS)) * VH

const CITIES: [string, number, number][] = [
  ['Kyiv', 50.45, 30.52],
  ['Kharkiv', 49.99, 36.23],
  ['Odesa', 46.48, 30.73],
  ['Lviv', 49.84, 24.03],
  ['Dnipro', 48.46, 35.05],
]

const ringPath = (ring: number[][]) => `M${ring.map((p) => `${px(p[0]).toFixed(1)} ${py(p[1]).toFixed(1)}`).join('L')}Z`

type Props = { region: Region; dateLabel: string }

export function FireMap({ region, dateLabel }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)

  // Redraw on any size change, including the sidebar collapse transition.
  useEffect(() => {
    const c = canvas.current!
    const draw = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = r.width * dpr
      c.height = r.height * dpr
      const g = c.getContext('2d')
      if (!g) return
      g.scale(c.width / VW, c.height / VH)
      const cw = VW / map.gw
      const ch = VH / map.gh
      for (let i = 0; i < map.grid.length; i++) {
        const l = parseInt(map.grid[i], 36)
        if (!l) continue
        g.fillStyle = ramp(SEQ, Math.pow(l / 35, 1.7))
        g.fillRect((i % map.gw) * cw + 0.7, Math.floor(i / map.gw) * ch + 0.9, cw - 1.4, ch - 1.8)
      }
    }
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  const [w, s, e, n] = bbox(region.aoi)
  const x = px(w)
  const y = py(n)
  const bw = px(e) - x
  const bh = py(s) - y
  const t = 14

  return (
    <section className="scene" id="top">
      <div className="map">
        <canvas ref={canvas} aria-hidden="true" />
        <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={`Map of Ukraine drawn from MODIS fire detections, with ${region.name} outlined`}>
          {[24, 28, 32, 36, 40].map((lon) => (
            <path key={lon} d={`M${px(lon)} 0V${VH}`} stroke="rgba(240,240,250,.09)" vectorEffect="non-scaling-stroke" />
          ))}
          {[46, 48, 50, 52].map((lat) => (
            <path key={lat} d={`M0 ${py(lat)}H${VW}`} stroke="rgba(240,240,250,.09)" vectorEffect="non-scaling-stroke" />
          ))}
          {map.border.map((ring, i) => (
            <path key={i} d={ringPath(ring)} fill="none" stroke={`rgba(240,240,250,${region.whole ? 0.9 : 0.32})`} vectorEffect="non-scaling-stroke" />
          ))}
          {CITIES.map(([name, lat, lon]) => (
            <g key={name}>
              <rect x={px(lon) - 3} y={py(lat) - 3} width="6" height="6" fill="#fff" />
              <text x={px(lon) + 14} y={py(lat) + 5}>
                {name}
              </text>
            </g>
          ))}
          {!region.whole && (
            <g>
              <path d={ringPath(region.aoi.coordinates[0])} fill="rgba(240,240,250,.06)" stroke="#fff" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
              <path
                d={`M${x} ${y + t}V${y}h${t}M${x + bw - t} ${y}h${t}v${t}M${x + bw} ${y + bh - t}v${t}h${-t}M${x + t} ${y + bh}h${-t}v${-t}`}
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              <path d={`M${x + bw} ${y}l34 -34h70`} fill="none" stroke="rgba(255,255,255,.7)" vectorEffect="non-scaling-stroke" />
              <text x={x + bw + 42} y={y - 42} style={{ fill: '#fff' }}>
                {region.short}
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="veil" />
      <div className="map-key">
        MODIS detections per 0.1° cell
        <div className="ramp" style={{ background: gradient(SEQ) }} />
        <div className="ramp-ends">
          <span>1</span>
          <span>{fmt(map.gmax)}</span>
        </div>
      </div>
      <div className="opening">
        <p className="date">{dateLabel}</p>
        <h1>{region.name}</h1>
      </div>
    </section>
  )
}
