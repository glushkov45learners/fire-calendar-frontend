import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { FireStat } from '@/shared/api'

export function FireChart({ data }: { data: FireStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Line type="monotone" dataKey="hotspots" name="Очаги" stroke="#ea580c" dot={false} />
        <Line type="monotone" dataKey="risk" name="Риск" stroke="#2563eb" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
