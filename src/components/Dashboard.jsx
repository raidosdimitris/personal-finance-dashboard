import { useState, useMemo, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { getCategoryColour, getAllCategories } from '../utils/categoriser'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

/* ============================================================
   InfoTooltip — Glassmorphism elevated tooltip
   ============================================================ */
function InfoTooltip({ text }) {
  return (
    <span className="info-tooltip-wrap">
      <span className="info-tooltip-trigger" aria-label="More information">?</span>
      <span className="info-tooltip-content" role="tooltip">{text}</span>
    </span>
  )
}

/**
 * Format a YYYY-MM string to a readable month label (e.g. "Jan 2025").
 */
function formatMonth(ym) {
  if (!ym || typeof ym !== 'string') return ym || ''
  const parts = ym.split('-')
  if (parts.length < 2) return ym
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return ym
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[month - 1]} ${year}`
}

/* ============================================================
   Chart.js global defaults for glassmorphism theme
   ============================================================ */
ChartJS.defaults.color = 'rgba(240,244,255,0.35)'
ChartJS.defaults.borderColor = 'rgba(255,255,255,0.06)'
ChartJS.defaults.font.family = "'Barlow', sans-serif"

export default function Dashboard({ transactions }) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedCategory, setSelectedCategory] = useState('all')
  const barRef = useRef(null)
  const donutRef = useRef(null)

  const categories = getAllCategories()

  /* ============ ALL LOGIC PRESERVED EXACTLY ============ */
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (dateRange.start && tx.date < dateRange.start) return false
      if (dateRange.end && tx.date > dateRange.end) return false
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false
      return true
    })
  }, [transactions, dateRange, selectedCategory])

  const spending = filtered.filter((tx) => tx.amount < 0)
  const income = filtered.filter((tx) => tx.amount >= 0)

  const totalSpending = spending.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0)
  const net = totalIncome - totalSpending

  const monthlyData = useMemo(() => {
    const months = {}
    spending.forEach((tx) => {
      const month = tx.date?.substring(0, 7) || 'Unknown'
      months[month] = (months[month] || 0) + Math.abs(tx.amount)
    })
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
  }, [spending])

  const categoryData = useMemo(() => {
    const cats = {}
    spending.forEach((tx) => {
      cats[tx.category] = (cats[tx.category] || 0) + Math.abs(tx.amount)
    })
    return Object.entries(cats).sort(([, a], [, b]) => b - a)
  }, [spending])

  const topMerchants = useMemo(() => {
    const merchants = {}
    spending.forEach((tx) => {
      const name = tx.description || 'Unknown'
      merchants[name] = (merchants[name] || 0) + Math.abs(tx.amount)
    })
    return Object.entries(merchants)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
  }, [spending])

  const recurring = useMemo(() => {
    const counts = {}
    spending.forEach((tx) => {
      const key = tx.description?.toLowerCase() || ''
      if (!counts[key]) counts[key] = { description: tx.description, total: 0, count: 0, months: new Set() }
      counts[key].total += Math.abs(tx.amount)
      counts[key].count++
      const month = tx.date?.substring(0, 7)
      if (month) counts[key].months.add(month)
    })
    return Object.values(counts)
      .filter((r) => r.count >= 2)
      .map((r) => ({
        ...r,
        numMonths: r.months.size,
        monthlyAvg: r.total / (r.months.size || 1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [spending])

  const monthComparison = useMemo(() => {
    if (monthlyData.length < 2) return null
    const current = monthlyData[monthlyData.length - 1]
    const previous = monthlyData[monthlyData.length - 2]
    const diff = current[1] - previous[1]
    const pct = previous[1] > 0 ? ((diff / previous[1]) * 100).toFixed(1) : '0.0'
    return { current: current[1], previous: previous[1], diff, pct: Number(pct), currentMonth: current[0], previousMonth: previous[0] }
  }, [monthlyData])

  /* ============ CHART CONFIGS (glassmorphism themed) ============ */
  const barChartData = {
    labels: monthlyData.map(([m]) => m),
    datasets: [{
      label: 'Spending (£)',
      data: monthlyData.map(([, v]) => v),
      backgroundColor: 'rgba(167,139,250,0.6)',
      hoverBackgroundColor: 'rgba(167,139,250,0.8)',
      borderColor: 'rgba(167,139,250,0.9)',
      borderWidth: 1,
      borderRadius: 6,
    }],
  }

  const donutChartData = {
    labels: categoryData.map(([c]) => c),
    datasets: [{
      data: categoryData.map(([, v]) => v),
      backgroundColor: categoryData.map(([c]) => getCategoryColour(c)),
      borderWidth: 2,
      borderColor: 'rgba(10,15,30,0.8)',
      hoverBorderColor: '#fff',
    }],
  }

  /* ============ EMPTY STATE ============ */
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">📊</div>
        <h2>No data to display</h2>
        <p>Upload and categorise transactions first</p>
      </div>
    )
  }

  /* ============ RENDER ============ */
  return (
    <div className="section-stack">
      {/* Filters */}
      <div className="glass-panel glass-panel--static panel-body">
        <div className="filter-bar">
          <div className="filter-group">
            <label className="glass-label" htmlFor="filter-from">From</label>
            <input
              id="filter-from"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
              className="glass-input"
              style={{ width: 'auto', minWidth: '160px' }}
            />
          </div>
          <div className="filter-group">
            <label className="glass-label" htmlFor="filter-to">To</label>
            <input
              id="filter-to"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
              className="glass-input"
              style={{ width: 'auto', minWidth: '160px' }}
            />
          </div>
          <div className="filter-group">
            <label className="glass-label" htmlFor="filter-cat">Category</label>
            <select
              id="filter-cat"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="glass-select"
              style={{ width: 'auto', minWidth: '180px', textTransform: 'capitalize' }}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setDateRange({ start: '', end: '' }); setSelectedCategory('all') }}
            className="btn btn-ghost"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="kpi-grid">
        <div className="glass-panel glass-panel--accent kpi-card">
          <div className="kpi-label">Total Spending</div>
          <div className="kpi-value kpi-value--danger text-mono">
            <span className="value-negative">£{totalSpending.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-panel glass-panel--accent kpi-card">
          <div className="kpi-label">Total Income</div>
          <div className="kpi-value kpi-value--success text-mono">
            <span className="value-positive">£{totalIncome.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-panel glass-panel--accent kpi-card">
          <div className="kpi-label">
            Net
            <InfoTooltip text="Net = Total Income minus Total Spending. Positive (green) means you saved money. Negative (red) means you spent more than you earned." />
          </div>
          <div className="kpi-value text-mono" style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            £{net.toFixed(2)}
          </div>
        </div>
        {monthComparison && (
          <div className="glass-panel glass-panel--accent kpi-card">
            <div className="kpi-label">
              vs Previous Month
              <InfoTooltip text={`Compares spending between ${formatMonth(monthComparison.currentMonth)} (£${monthComparison.current.toFixed(2)}) and ${formatMonth(monthComparison.previousMonth)} (£${monthComparison.previous.toFixed(2)}). Negative (green) = you spent less than last month. Positive (red) = you spent more.`} />
            </div>
            <div className="kpi-value text-mono" style={{ color: monthComparison.pct <= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {monthComparison.pct > 0 ? '+' : ''}{monthComparison.pct.toFixed(1)}%
            </div>
            <div className="kpi-sublabel">
              {formatMonth(monthComparison.currentMonth)} vs {formatMonth(monthComparison.previousMonth)}
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Spending Over Time */}
        <div className="glass-panel glass-panel--static chart-container">
          <h3>Spending Over Time</h3>
          <div className="chart-wrap" id="bar-chart">
            <Bar
              ref={barRef}
              data={barChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(13,27,62,0.95)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    titleFont: { family: "'DM Mono', monospace" },
                    bodyFont: { family: "'DM Mono', monospace" },
                    padding: 12,
                    cornerRadius: 8,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `£${v}` },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                  },
                  x: {
                    grid: { color: 'rgba(255,255,255,0.06)' },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="glass-panel glass-panel--static chart-container">
          <h3>Category Breakdown</h3>
          <div className="chart-wrap chart-wrap--donut" id="donut-chart">
            <Doughnut
              ref={donutRef}
              data={donutChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      padding: 16,
                      color: 'rgba(240,244,255,0.6)',
                      font: { family: "'Outfit', sans-serif", size: 11 },
                    },
                  },
                  tooltip: {
                    backgroundColor: 'rgba(13,27,62,0.95)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    borderWidth: 1,
                    titleFont: { family: "'DM Mono', monospace" },
                    bodyFont: { family: "'DM Mono', monospace" },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: { label: (ctx) => `${ctx.label}: £${ctx.raw.toFixed(2)}` },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Categories */}
      {categoryData.length > 0 && (
        <div className="glass-panel glass-panel--static panel-body">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>Top Categories</h3>
          <div>
            {categoryData.map(([name, amount]) => {
              const pct = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : 0
              return (
                <div key={name} className="rank-row">
                  <div className="rank-left">
                    <span className="rank-dot" style={{ backgroundColor: getCategoryColour(name) }} aria-hidden="true" />
                    <span className="rank-name">{name}</span>
                  </div>
                  <div className="rank-right">
                    <span className="rank-pct">{pct}%</span>
                    <span className="rank-amount">£{amount.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Merchants */}
      <div className="glass-panel glass-panel--static panel-body">
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>Top Merchants</h3>
        <div>
          {topMerchants.map(([name, amount], i) => {
            const pct = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : 0
            return (
              <div key={name} className="rank-row">
                <div className="rank-left">
                  <span className="rank-num">{i + 1}.</span>
                  <span className="rank-name" style={{ textTransform: 'none' }}>{name}</span>
                </div>
                <div className="rank-right">
                  <span className="rank-pct">{pct}%</span>
                  <span className="rank-amount">£{amount.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recurring Payments */}
      {recurring.length > 0 && (
        <div className="glass-panel glass-panel--static panel-body">
          <h3 className="section-title" style={{ marginBottom: '1rem' }}>
            🔄 Recurring Payments
            <InfoTooltip text="Payments are classified as recurring when the same merchant appears 2 or more times in your transaction history." />
          </h3>
          <div>
            {recurring.map((r) => (
              <div key={r.description} className="recurring-row">
                <div>
                  <span className="recurring-name">{r.description}</span>
                  <span className="recurring-count">({r.count} times)</span>
                </div>
                <span className="recurring-amounts">
                  £{r.monthlyAvg.toFixed(2)}/mo avg • Total: £{r.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
