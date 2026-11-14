import type { ReactNode } from 'react'
import { scaleName, sensorValue, VIIRS_START_YEAR, type Sensor } from '@/entities/sensor'
import type { Meta, MonthlyRow } from '@/shared/api'
import { fmt } from '@/shared/lib/format'
import { SpecList } from '@/shared/ui/spec-list'

type Props = { rows: MonthlyRow[] | null; meta: Meta | null }

const W = 760
const H = 240
const L = 4
const R = 92
const T = 16
const B = 28

/** Yearly totals of raw MODIS against the harmonized record over the baseline years: the 2012 step and how it is removed. */
export function SensorChart({ rows, meta }: Props) {
  if (!rows || !meta) return <Frame copy="Loading the record…" />
  const [b0, b1] = meta.baseline_years
  const years = Array.from({ length: b1 - b0 + 1 }, (_, i) => b0 + i)
  const total = (s: Sensor, y: number) => rows.filter((r) => r.period.startsWith(`${y}-`)).reduce((a, r) => a + sensorValue(r, s), 0)
  const modis = years.map((y) => total('modis', y))
  const harm = years.map((y) => total('harm', y))
  const overlap = rows.filter((r) => +r.period.slice(0, 4) >= VIIRS_START_YEAR && +r.period.slice(0, 4) <= b1)
  const k = overlap.reduce((a, r) => a + r.viirs_raw, 0) / Math.max(1, overlap.reduce((a, r) => a + r.modis_raw, 0))

  const max = Math.max(1, ...modis, ...harm)
  const X = (i: number) => L + (i / (years.length - 1)) * (W - L - R)
  const Y = (v: number) => T + (1 - v / max) * (H - T - B)
  const path = (a: number[]) => a.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join('')
  const x12 = X(VIIRS_START_YEAR - b0)
  const yh = Y(harm.at(-1)!)
  const ym = Math.max(Y(modis.at(-1)!), yh + 14)
  const ticks = [b0, Math.round((b0 + VIIRS_START_YEAR) / 2), VIIRS_START_YEAR, Math.round((VIIRS_START_YEAR + b1) / 2), b1]
  const scale = scaleName(meta.model.reference_scale)
  const m = meta.model
  const span = (ys: number[]) => (ys.length ? `${ys[0]}–${ys.at(-1)}` : 'n/a')

  return (
    <Frame
      copy={
        <>
          MODIS has recorded fires since November 2000 at 1 km resolution. VIIRS joined in {VIIRS_START_YEAR} at 375 m and reports{' '}
          <strong>{k.toFixed(1)} detections for every MODIS detection</strong> over this area. Read side by side, the two archives show a step in {VIIRS_START_YEAR} that no fire caused. The harmonized record restates both in {scale} detections, so {b1 - b0 + 1} years can be compared on one scale.
        </>
      }
      spec={[
        ['Model', m.model_version],
        ['Scale', scale],
        ['Fitted on', span(m.fit_years)],
        ['Checked on', span(m.holdout_years)],
        ['Error (MAPE)', `${(m.metrics.mape * 100).toFixed(0)}%`],
        ['R²', m.metrics.r2.toFixed(2)],
      ]}
      notes={m.notes}
      chart={
        <svg className="lines" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Detections per year, ${b0}–${b1}, for MODIS and the harmonized record`}>
          <path d={`M${L} ${H - B + 0.5}H${W - R}`} stroke="rgba(240,240,250,.3)" />
          {ticks.map((y) => (
            <text key={y} x={X(y - b0)} y={H - 8} textAnchor={y === b0 ? 'start' : 'middle'}>
              {y}
            </text>
          ))}
          <path d={`M${x12} ${T}V${H - B}`} stroke="rgba(240,240,250,.4)" strokeDasharray="2 4" />
          <text x={x12 + 6} y={T + 4}>
            VIIRS begins
          </text>
          <path d={path(modis)} fill="none" stroke="rgba(240,240,250,.5)" />
          <path d={path(harm)} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <text className="hi" x={W - R + 8} y={yh + 4}>
            Harmonized
          </text>
          <text x={W - R + 8} y={Math.min(ym + 4, H - B - 2)}>
            MODIS
          </text>
          <text x={L} y={T + 4}>
            {fmt(max)} / yr
          </text>
        </svg>
      }
    />
  )
}

type FrameProps = { copy: ReactNode; spec?: [string, string][]; notes?: string; chart?: ReactNode }

function Frame({ copy, spec, notes, chart }: FrameProps) {
  return (
    <section className="chapter" id="sensors">
      <div className="split">
        <div>
          <h2>Two sensors, one record</h2>
          <p>{copy}</p>
        </div>
        <div>
          {spec && <SpecList rows={spec} />}
          {notes && <p className="hint">{notes}</p>}
        </div>
        {chart}
      </div>
    </section>
  )
}
