export type Row = { kind: 'year'; year: number } | { kind: 'gap'; from: number; to: number }

/** Whole years without a single observation collapse into one band, so they never read as zeros. */
export function toRows(years: number[], hasYear: (y: number) => boolean, collapse: boolean): Row[] {
  const rows: Row[] = []
  for (const y of years) {
    const last = rows.at(-1)
    if (!collapse || hasYear(y)) rows.push({ kind: 'year', year: y })
    else if (last?.kind === 'gap') last.from = y
    else rows.push({ kind: 'gap', from: y, to: y })
  }
  return rows
}
