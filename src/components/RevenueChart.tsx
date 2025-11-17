import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'

type DataPoint = {
  label: string
  value: number
  isCurrent?: boolean
}

type RevenueChartProps = {
  data: DataPoint[]
  formatCurrency: (n: number) => string
  previousMonthTotal: number
  currentMonthTotal: number
}

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (!active || !payload || !payload.length) return null
  const value = payload[0].value || 0
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: 8, boxShadow: '0 8px 30px rgba(15,23,42,0.1)' }}>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{formatCurrency(value)}</div>
    </div>
  )
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data, formatCurrency, currentMonthTotal, previousMonthTotal }) => {
  const delta = currentMonthTotal - previousMonthTotal
  const deltaPositive = delta >= 0
  const neutralDelta = previousMonthTotal === 0 && currentMonthTotal === 0
  let deltaCopy = '— vs last month'

  if (previousMonthTotal === 0 && currentMonthTotal > 0) {
    deltaCopy = '▲ New vs last month'
  } else if (previousMonthTotal === 0 && currentMonthTotal === 0) {
    deltaCopy = '— vs last month'
  } else if (previousMonthTotal > 0) {
    const deltaPercent = (delta / previousMonthTotal) * 100
    deltaCopy = `${deltaPositive ? '▲' : '▼'} ${Math.abs(deltaPercent).toFixed(1)}% vs last month`
  }
  const deltaColor = neutralDelta ? '#94a3b8' : deltaPositive ? '#0f9d58' : '#dc2626'

  const maxValue = data.reduce((max, point) => Math.max(max, point.value), 0)
  const safeMax = Math.max(maxValue, currentMonthTotal, previousMonthTotal, 1000)
  const domainMax = Math.ceil((safeMax * 1.1) / 1000) * 1000

  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 25px 60px rgba(15,23,42,0.08)', marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Monthly Revenue Trend</h4>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>Comparing the last six months of sales totals</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>Current Month</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{formatCurrency(currentMonthTotal)}</div>
          <div style={{ fontSize: 13, color: deltaColor, fontWeight: 600 }}>
            {deltaCopy}
          </div>
        </div>
      </div>

      <div style={{ height: 340, paddingLeft: 12 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} />
            <YAxis
              domain={[0, domainMax]}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={50}
            />
            <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
            <Legend verticalAlign="top" height={36} />
            <Bar
              dataKey="value"
              name="Revenue"
              fill="#0ea5e9"
              radius={[10, 10, 0, 0]}
              label={{ position: 'top', formatter: (value: number) => formatCurrency(value) }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default RevenueChart

