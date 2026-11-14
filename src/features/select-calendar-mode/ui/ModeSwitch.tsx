import type { RecordKind } from '@/entities/analysis'
import { Segmented } from '@/shared/ui/segmented'
import { effectiveMode, type CalendarMode } from '../model/mode'

type Props = { value: CalendarMode; record: RecordKind; onChange: (m: CalendarMode) => void }

export function ModeSwitch({ value, record, onChange }: Props) {
  const raw = record !== 'harm'
  return (
    <>
      <Segmented
        label="Calendar shows"
        value={effectiveMode(value, record)}
        options={[
          { id: 'count', label: 'Detections' },
          { id: 'anom', label: 'Anomaly', disabled: raw },
        ]}
        onChange={onChange}
      />
      {raw && (
        <p className="hint">
          Anomaly is shown for the harmonized record only. Its norm, z-score and class come from the backend; raw MODIS and VIIRS counts jump
          whenever a satellite joins, so a norm over them would flag steps no fire caused.
        </p>
      )}
    </>
  )
}
