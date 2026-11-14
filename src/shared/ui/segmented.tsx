type Option<T extends string> = { id: T; label: string; disabled?: boolean }
type Props<T extends string> = { label: string; value: T; options: readonly Option<T>[]; onChange: (v: T) => void }

/** The design's segmented buttons; the pressed one is filled. */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={o.id === value} disabled={o.disabled} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
