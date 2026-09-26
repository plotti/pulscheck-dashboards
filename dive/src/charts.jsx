// Chart-Komponenten auf Recharts-Basis — dieselbe Bibliothek, die MotherDuck
// als Default für Dives verwendet.

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtDay, fmtInt } from './format'

const axisStyle = { fontSize: 12, fill: '#6b7280' }

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 13,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}

function ChartFrame({ children, height = 260 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {children}
    </ResponsiveContainer>
  )
}

export function AnswersLine({ data }) {
  const shaped = data.map((r) => ({ ...r, day: fmtDay(r.day) }))
  return (
    <ChartFrame>
      <LineChart data={shaped} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="day" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtInt} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtInt(v), 'Antworten']}
        />
        <Line type="monotone" dataKey="answers" stroke="#FF9538" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartFrame>
  )
}

export function RevenueArea({ data }) {
  const shaped = data.map((r) => ({ ...r, day: fmtDay(r.day) }))
  return (
    <ChartFrame>
      <AreaChart data={shaped} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF9538" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FF9538" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="day" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtInt} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`${fmtInt(v)} CHF`, 'Umsatz']}
        />
        <Area type="monotone" dataKey="revenue_chf" stroke="#FF9538" fill="url(#revFill)" strokeWidth={2} />
      </AreaChart>
    </ChartFrame>
  )
}

export function SizeBars({ data }) {
  return (
    <ChartFrame height={220}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="package_size" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtInt} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`${fmtInt(v)} CHF`, 'Umsatz']}
        />
        <Bar dataKey="revenue_chf" fill="#FF9538" radius={[6, 6, 0, 0]} maxBarSize={80} />
      </BarChart>
    </ChartFrame>
  )
}

export function TrendBySize({ data, sizes }) {
  const colors = { S: '#60a5fa', M: '#FF9538', XL: '#34d399' }
  const shaped = data.map((r) => ({ ...r, day: fmtDay(r.day) }))
  return (
    <ChartFrame height={280}>
      <AreaChart data={shaped} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
        <XAxis dataKey="day" tick={axisStyle} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtInt} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => [`${fmtInt(v)} CHF`, `Paket ${name}`]}
        />
        {sizes.map((s) => (
          <Area
            key={s}
            type="monotone"
            dataKey={s}
            stackId="1"
            stroke={colors[s] ?? '#94a3b8'}
            fill={colors[s] ?? '#94a3b8'}
            fillOpacity={0.45}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  )
}

export function GeoBars({ data }) {
  return (
    <ChartFrame height={Math.max(200, data.length * 34 + 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtInt} />
        <YAxis type="category" dataKey="country" tick={axisStyle} tickLine={false} axisLine={false} width={36} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtInt(v), 'Antworten']}
        />
        <Bar dataKey="answers" fill="#fbbf77" radius={[0, 6, 6, 0]} maxBarSize={22} />
      </BarChart>
    </ChartFrame>
  )
}
