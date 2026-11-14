import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

type Props = { from: number; to: number; min: number; max: number; onChange: (from: number, to: number) => void }

export function PeriodSelect({ from, to, min, max, onChange }: Props) {
  const years = Array.from({ length: max - min + 1 }, (_, i) => max - i)

  const year = (label: string, value: number, set: (y: number) => void, allowed: (y: number) => boolean) => (
    <Select value={String(value)} onValueChange={(v) => set(Number(v))}>
      <SelectTrigger aria-label={label} className="num">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.filter(allowed).map((y) => (
          <SelectItem key={y} value={String(y)} className="num">
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div role="group" aria-label="Period" className="flex items-center gap-2">
      {year('From year', from, (y) => onChange(y, to), (y) => y <= to)}
      <span className="text-ink-3 text-sm">to</span>
      {year('To year', to, (y) => onChange(from, y), (y) => y >= from)}
    </div>
  )
}
