import { RECORDS, type RecordKind } from '@/entities/analysis'
import { Segmented } from '@/shared/ui/segmented'

type Props = { value: RecordKind; scale: string; onChange: (k: RecordKind) => void }

export function RecordSwitch({ value, scale, onChange }: Props) {
  const hint: Record<RecordKind, string> = {
    harm: `MODIS and VIIRS S-NPP restated in ${scale} detections. One scale from 2000 to today.`,
    modis: 'Terra and Aqua, 1 km. The longest record, with fewer small fires. Raw counts.',
    viirs: 'Suomi NPP, 375 m. Sees smaller fires, but only from 2012. Raw counts.',
  }
  return (
    <>
      <Segmented label="Record" value={value} options={RECORDS} onChange={onChange} />
      <p className="hint">{hint[value]}</p>
    </>
  )
}
