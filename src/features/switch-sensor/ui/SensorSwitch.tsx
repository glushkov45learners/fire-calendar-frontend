import { scaleName, SENSORS, type Sensor } from '@/entities/sensor'
import type { Meta } from '@/shared/api'
import { Segmented } from '@/shared/ui/segmented'

type Props = { value: Sensor; meta: Meta | null; onChange: (s: Sensor) => void }

export function SensorSwitch({ value, meta, onChange }: Props) {
  const scale = meta ? scaleName(meta.model.reference_scale) : 'one-scale'
  const hint: Record<Sensor, string> = {
    harm: `MODIS and VIIRS restated in ${scale} detections. One scale from 2000 to today.`,
    modis: 'Terra and Aqua, 1 km. The longest record, with fewer small fires.',
    viirs: 'Suomi NPP, 375 m. Sees smaller fires, but only from 2012.',
  }
  return (
    <>
      <Segmented label="Record" value={value} options={SENSORS} onChange={onChange} />
      <p className="hint">{hint[value]}</p>
    </>
  )
}
