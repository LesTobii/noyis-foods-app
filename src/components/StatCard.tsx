import React from 'react'

type Props = {
  title: string // e.g., 'Today'
  value: string // e.g., '₦12,000'
  subtitle?: string // e.g., '24 sales'
  variant?: 'emerald' | 'amber' | 'sky'
}

const StatCard: React.FC<Props> = ({ title, value, subtitle, variant = 'emerald' }) => {
  return (
    <div className={`stat-card stat-${variant}`} style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>{title}</div>
      <div style={{fontSize:20,fontWeight:600,color:'var(--text)'}}>{value}</div>
      {subtitle ? <div style={{fontSize:12,color:'#6b7280'}}>{subtitle}</div> : null}
    </div>
  )
}

export default StatCard
