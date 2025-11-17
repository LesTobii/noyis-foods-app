import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import StatCard from './StatCard'
import RevenueChart from './RevenueChart'

const formatCurrency = (n: number) => `₦${n.toLocaleString()}`

const AdminDashboard: React.FC = () => {
  const { globalSales, sales, isAdmin, deleteSale, setEditingSale, pushConfirm, pushToast, isOnline, hasPendingWrites } = useApp()

  const dataset = (isAdmin ? globalSales : sales) || []

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [showCharts, setShowCharts] = useState(false)
  const RECORDS_PER_PAGE = 5

  // Helper: extract YYYY-MM-DD from any date format
  const extractDateOnly = (s: any): string => {
    let dateStr = s.date || ''
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }
    if (dateStr && dateStr.includes('T')) {
      return dateStr.split('T')[0]
    }
    if (!dateStr && s.createdAt) {
      const ca = s.createdAt
      const d = ca && ca.toDate ? ca.toDate() : (ca ? new Date(ca) : null)
      if (d) {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const dy = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${dy}`
      }
    }
    return ''
  }

  // Default to current date
  const now = new Date()
  const defaultYear = String(now.getFullYear())
  const defaultMonth = String(now.getMonth() + 1).padStart(2, '0')
  const defaultDay = String(now.getDate()).padStart(2, '0')

  // Filter state: Day/Month/Year selectors
  const [selectedYear, setSelectedYear] = useState<string>(defaultYear)
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay)

  // Generate available years from dataset + future
  const years = useMemo(() => {
    const yearsSet = new Set<number>()
    yearsSet.add(now.getFullYear())
    for (let y = now.getFullYear() - 5; y <= now.getFullYear() + 1; y++) {
      if (y >= 2022) yearsSet.add(y)
    }
    for (const s of dataset) {
      const dateStr = extractDateOnly(s)
      if (dateStr) {
        const year = parseInt(dateStr.split('-')[0], 10)
        if (year >= 2022) yearsSet.add(year)
      }
    }
    return Array.from(yearsSet).sort((a, b) => b - a).map(y => String(y))
  }, [dataset])

  // Generate available months (1-12)
  const monthOptions = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  // Helper to get month name from number
  const getMonthName = (monthNum: string) => {
    const m = monthOptions.find(m => m.value === monthNum)
    return m ? m.label : monthNum
  }

  // Generate available days (1-31)
  const dayOptions = useMemo(() => {
    const opts = []
    for (let d = 1; d <= 31; d++) {
      opts.push({ value: String(d).padStart(2, '0'), label: String(d) })
    }
    return opts
  }, [])

  // Compute KPIs for the selected timeline
  const { dayTotal, dayCount, monthTotal, monthCount, yearTotal, yearCount } = useMemo(() => {
    let dayTotal = 0, dayCount = 0
    let monthTotal = 0, monthCount = 0
    let yearTotal = 0, yearCount = 0

    const selectedDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`

    for (const s of dataset) {
      const dateStr = extractDateOnly(s)
      if (!dateStr) continue

      const t = Number((s as any).total || 0)
      const [recordYear, recordMonth, recordDay] = dateStr.split('-')

      // Year match
      if (recordYear === selectedYear) {
        yearTotal += t
        yearCount += 1

        // Month match (within selected year)
        if (recordMonth === selectedMonth) {
          monthTotal += t
          monthCount += 1

          // Day match (within selected month)
          if (recordDay === selectedDay) {
            dayTotal += t
            dayCount += 1
          }
        }
      }
    }

    return { dayTotal, dayCount, monthTotal, monthCount, yearTotal, yearCount }
  }, [dataset, selectedYear, selectedMonth, selectedDay])

  const monthlySeries = useMemo(() => {
    const totals = new Map<string, number>()
    for (const s of dataset) {
      const dateStr = extractDateOnly(s)
      if (!dateStr) continue
      const [year, month] = dateStr.split('-')
      if (!year || !month) continue
      const key = `${year}-${month}`
      const amount = Number((s as any).total || 0)
      totals.set(key, (totals.get(key) || 0) + amount)
    }

    const monthsToShow = 6
    const refDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const start = new Date(refDate.getFullYear(), refDate.getMonth() - (monthsToShow - 1), 1)
    const series: Array<{ key: string; label: string; value: number; isCurrent?: boolean }> = []

    for (let i = 0; i < monthsToShow; i++) {
      const current = new Date(start.getFullYear(), start.getMonth() + i, 1)
      const year = current.getFullYear()
      const monthNumber = String(current.getMonth() + 1).padStart(2, '0')
      const key = `${year}-${monthNumber}`
      const label = `${getMonthName(monthNumber).slice(0, 3)} ${String(year).slice(2)}`
      series.push({
        key,
        label,
        value: totals.get(key) || 0,
        isCurrent: i === monthsToShow - 1
      })
    }

    return series
  }, [dataset])

  const currentMonthTotal = monthlySeries[monthlySeries.length - 1]?.value || 0
  const previousMonthTotal = monthlySeries[monthlySeries.length - 2]?.value || 0

  // Filter records for display (show records matching selected day/month/year)
  const filteredRecent = useMemo(() => {
    const selectedDateStr = `${selectedYear}-${selectedMonth}-${selectedDay}`
    
    const result = []
    for (const s of dataset) {
      const dateStr = extractDateOnly(s)
      if (dateStr === selectedDateStr) {
        result.push(s)
      }
    }

    // Sort by time descending
    result.sort((a, b) => {
      const timeA = a.time || ''
      const timeB = b.time || ''
      return timeB.localeCompare(timeA)
    })

    return result
  }, [dataset, selectedYear, selectedMonth, selectedDay])

  // Pagination
  const totalPages = Math.ceil(filteredRecent.length / RECORDS_PER_PAGE)
  const paginatedRecent = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PER_PAGE
    const end = start + RECORDS_PER_PAGE
    return filteredRecent.slice(start, end)
  }, [filteredRecent, currentPage])

  // Reset pagination when filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedYear, selectedMonth, selectedDay])

  const exportCSV = () => {
    const rows = filteredRecent || []
    if (!rows.length) {
      alert('No records to export')
      return
    }
    const header = ['id','date','time','product','flavor','unit','price','total','paymentMode','userId','userEmail']
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g,'""')}"`
    const formatTime = (t: string) => {
      if (!t) return ''
      const match = t.match(/(\d{2}):(\d{2})/)
      return match ? `${match[1]}:${match[2]}` : t
    }
    const csv = [header.join(',')].concat(rows.map((r: any) => {
      const dateCell = r.date ? `="${r.date}"` : ''
      return [r.id, dateCell, formatTime(r.time || ''), r.product, r.flavor || '', r.unit, r.price, r.total, r.paymentMode || 'POS', r.userId || '', r.userEmail || ''].map(esc).join(',')
    })).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noyis-sales-${selectedYear}-${selectedMonth}-${selectedDay}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleEditClick = (s: any) => {
    setEditingSale({ ...s })
    pushToast('Opening sales form to edit record', 'info')
  }

  const handleDeleteClick = async (s: any) => {
    const ok = await pushConfirm('Delete this record permanently?')
    if (!ok) return
    try {
      await deleteSale(s.id)
      pushToast('Record deleted', 'success')
    } catch (e) {
      console.error(e)
      pushToast('Failed to delete', 'error')
    }
  }

  return (
    <div className="card dashboard-card" style={{maxWidth:1400,margin:'0 auto'}}>
      {/* Online/Offline & Pending Writes Indicator */}
      <div style={{padding:'8px 16px',background: isOnline ? '#ecfdf5' : '#fee2e2',borderBottom:'1px solid #e6e9ef',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:8,height:8,borderRadius:'50%',background: isOnline ? '#10b981' : '#ef4444'}}></div>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          {hasPendingWrites && (
            <div style={{display:'flex',alignItems:'center',gap:6,color:'#f59e0b'}}>
              <span style={{fontSize:10}}>⏳</span>
              <span>Syncing data...</span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-header">
        <div>
          <h3 className="dashboard-title">Dashboard</h3>
          <div className="dashboard-sub">{isAdmin ? 'Overview — All staff' : 'Your sales'}</div>
        </div>
        <div className="dashboard-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{isAdmin ? 'Global view' : 'Personal view'}</span>
          <button
            className="btn btn-ghost"
            onClick={() => setShowCharts(v => !v)}
            style={{ border: '1px solid #dbeafe', padding: '8px 14px' }}
          >
            {showCharts ? 'Hide Charts' : 'View Charts'}
          </button>
        </div>
      </div>

      <section className="kpi-row" style={{gap:24}}>
        <StatCard title={`${getMonthName(selectedMonth)} ${selectedDay}`} value={formatCurrency(dayTotal)} subtitle={`${dayCount} sales`} variant="emerald" />
        <StatCard title={`${getMonthName(selectedMonth)} ${selectedYear}`} value={formatCurrency(monthTotal)} subtitle={`${monthCount} sales`} variant="amber" />
        <StatCard title={`Year: ${selectedYear}`} value={formatCurrency(yearTotal)} subtitle={`${yearCount} sales`} variant="sky" />
      </section>

      {showCharts && (
        <section className="recent-section" style={{ paddingTop: 0 }}>
          <RevenueChart
            data={monthlySeries}
            formatCurrency={formatCurrency}
            currentMonthTotal={currentMonthTotal}
            previousMonthTotal={previousMonthTotal}
          />
        </section>
      )}

      <section className="recent-section">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h4 className="recent-title">Timeline Selection</h4>
        </div>
        
        {/* Date selectors */}
        <div style={{display:'flex',gap:12,marginBottom:20,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:12,color:'#6b7280',fontWeight:600}}>Year</label>
            <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:12,color:'#6b7280',fontWeight:600}}>Month</label>
            <select className="filter-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:12,color:'#6b7280',fontWeight:600}}>Day</label>
            <select className="filter-select" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
              {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          <button className="btn btn-ghost" onClick={exportCSV} style={{marginTop:20}}>Export CSV</button>
        </div>

        <h4 className="recent-title" style={{marginBottom:12}}>Records for {getMonthName(selectedMonth)} {selectedDay}, {selectedYear}</h4>
        
        {/* Fixed header row */}
        {paginatedRecent.length > 0 && (
          <div className="recent-item" style={{position:'sticky',top:0,background:'linear-gradient(180deg,#f0f9ff,#e6f2ff)',fontWeight:700,zIndex:10,boxShadow:'0 2px 4px rgba(0,0,0,0.05)',display:'grid',gridTemplateColumns:'120px 80px 1fr 80px 110px 110px 90px 220px 120px',gap:12}}>
            <div className="ri-date" style={{textAlign:'center'}}>Date</div>
            <div className="ri-time" style={{textAlign:'center'}}>Time</div>
            <div className="ri-item">Item</div>
            <div className="ri-unit" style={{textAlign:'center'}}>Unit</div>
            <div className="ri-price" style={{textAlign:'right'}}>Price</div>
            <div className="ri-total" style={{textAlign:'right'}}>Total</div>
            <div className="ri-payment" style={{textAlign:'center'}}>Payment</div>
            <div className="ri-by" style={{textAlign:'center'}}>Entered By</div>
            <div className="ri-actions" style={{textAlign:'center'}}>Actions</div>
          </div>
        )}
        <div className="recent-list">
          {paginatedRecent.length > 0 ? (
            paginatedRecent.map((s: any) => {
              const dateStr = extractDateOnly(s)
              const timeOnly = s.time || ''

              return (
                <div className="recent-item" key={s.id}>
                  <div className="ri-date" style={{textAlign:'center'}}>{dateStr || '-'}</div>
                  <div className="ri-time" style={{textAlign:'center'}}>{timeOnly ? timeOnly.split('.')[0] : '-'}</div>
                  <div className="ri-item">
                    <div style={{fontWeight:700}}>{s.product}</div>
                    {s.flavor && <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>({s.flavor})</div>}
                  </div>
                  <div className="ri-unit" style={{textAlign:'center'}}>{s.unit}</div>
                  <div className="ri-price">{formatCurrency(Number(s.price || 0))}</div>
                  <div className="ri-total">{formatCurrency(Number(s.total || 0))}</div>
                  <div className="ri-payment" style={{textAlign:'center'}}>{s.paymentMode || 'POS'}</div>
                  <div className="ri-by" style={{textAlign:'center'}}>{s.userEmail || s.userId}</div>
                  <div className="ri-actions">
                    <button className="btn-small" onClick={() => handleEditClick(s)}>Edit</button>
                    <button className="btn-small danger" onClick={() => handleDeleteClick(s)}>Delete</button>
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{padding:24,textAlign:'center',color:'#94a3b8',fontSize:14}}>No records found for this date</div>
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:16,paddingBottom:8}}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e6e9ef',background:'#fff',cursor: currentPage === 1 ? 'not-allowed' : 'pointer',opacity: currentPage === 1 ? 0.5 : 1}}
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding:'6px 10px',
                  borderRadius:6,
                  border: currentPage === page ? '1px solid var(--emerald)' : '1px solid #e6e9ef',
                  background: currentPage === page ? 'var(--emerald)' : '#fff',
                  color: currentPage === page ? '#fff' : '#111',
                  cursor:'pointer',
                  fontWeight: currentPage === page ? 700 : 400,
                  fontSize:13
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{padding:'6px 10px',borderRadius:6,border:'1px solid #e6e9ef',background:'#fff',cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',opacity: currentPage === totalPages ? 0.5 : 1}}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminDashboard
