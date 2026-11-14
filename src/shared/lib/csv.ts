/** Header row → records. Handles quoted fields with commas and doubled quotes; FIRMS files rarely need either. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length)
  if (!lines.length) return []
  const head = splitLine(lines[0])
  return lines.slice(1).map((l) => {
    const cells = splitLine(l)
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']))
  })
}

function splitLine(line: string): string[] {
  if (!line.includes('"')) return line.split(',')
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cur += '"'
      i++
    } else if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}
