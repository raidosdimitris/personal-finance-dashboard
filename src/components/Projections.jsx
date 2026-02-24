import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { getCategoryColour } from '../utils/categoriser'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

function InfoTooltip({ text }) {
  return (
    <span className="info-tooltip-wrap">
      <span className="info-tooltip-trigger" aria-label="More information">?</span>
      <span className="info-tooltip-content" role="tooltip">{text}</span>
    </span>
  )
}

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

function getNextMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return `${nextY}-${String(nextM).padStart(2, '0')}`
}

/**
 * Median of an array of numbers (ignores zeros for sparse categories).
 * Uses only non-zero values to avoid underestimating recurring spending.
 */
function median(values) {
  const nonZero = values.filter(v => v > 0)
  if (nonZero.length === 0) return 0
  const sorted = [...nonZero].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Compute trend direction: +1 (rising), -1 (falling), 0 (stable).
 */
function trendDirection(values) {
  if (values.length < 2) return 0
  const recent = values[values.length - 1]
  const prev = values[values.length - 2]
  if (prev === 0) return recent > 0 ? 1 : 0
  const pct = ((recent - prev) / prev) * 100
  if (Math.abs(pct) < 5) return 0
  return pct > 0 ? 1 : -1
}

function TrendBadge({ direction }) {
  if (direction === 1) return <span className="trend-badge trend-up">↑ Rising</span>
  if (direction === -1) return <span className="trend-badge trend-down">↓ Falling</span>
  return <span className="trend-badge trend-stable">→ Stable</span>
}

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Monthly' },
  { value: 'quarter', label: 'Quarterly' },
  { value: 'year', label: 'Yearly' },
]

export default function Projections({ transactions }) {
  const [period, setPeriod] = useState('month')
  const spending = useMemo(() => transactions.filter(tx => tx.amount < 0), [transactions])

  const sortedMonths = useMemo(() => {
    const monthSet = new Set()
    spending.forEach(tx => {
      const d = tx.date
      if (!d || typeof d !== 'string') return
      // Extract YYYY-MM — handles ISO dates (YYYY-MM-DD) and similar
      const match = d.match(/^(\d{4})-(\d{2})/)
      if (match) monthSet.add(`${match[1]}-${match[2]}`)
    })
    return [...monthSet].sort()
  }, [spending])

  const nextMonth = sortedMonths.length > 0 ? getNextMonth(sortedMonths[sortedMonths.length - 1]) : null

  const periodMultiplier = period === 'quarter' ? 3 : period === 'year' ? 12 : 1
  const periodLabel = period === 'quarter' ? 'Quarterly' : period === 'year' ? 'Yearly' : 'Monthly'

  /* Category projections */
  const categoryProjections = useMemo(() => {
    if (sortedMonths.length < 2) return []
    const catMonthly = {}
    spending.forEach(tx => {
      const d = tx.date
      if (!d || typeof d !== 'string') return
      const match = d.match(/^(\d{4})-(\d{2})/)
      if (!match) return
      const m = `${match[1]}-${match[2]}`
      if (!catMonthly[tx.category]) catMonthly[tx.category] = {}
      catMonthly[tx.category][m] = (catMonthly[tx.category][m] || 0) + Math.abs(tx.amount)
    })

    return Object.entries(catMonthly)
      .map(([cat, months]) => {
        const values = sortedMonths.map(m => months[m] || 0)
        const recent = values.slice(-6)
        const projected = median(recent)
        const trend = trendDirection(recent)
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length
        return { category: cat, projected, trend, avg, monthlyValues: values }
      })
      .filter(p => p.projected > 0.5)
      .sort((a, b) => b.projected - a.projected)
  }, [spending, sortedMonths])

  /* Merchant projections */
  const merchantProjections = useMemo(() => {
    if (sortedMonths.length < 2) return []
    const merchMonthly = {}
    spending.forEach(tx => {
      const d = tx.date
      if (!d || typeof d !== 'string') return
      const match = d.match(/^(\d{4})-(\d{2})/)
      if (!match) return
      const m = `${match[1]}-${match[2]}`
      const name = tx.description || 'Unknown'
      if (!merchMonthly[name]) merchMonthly[name] = {}
      merchMonthly[name][m] = (merchMonthly[name][m] || 0) + Math.abs(tx.amount)
    })

    return Object.entries(merchMonthly)
      .map(([merchant, months]) => {
        const activeMonths = sortedMonths.filter(m => months[m] > 0)
        if (activeMonths.length < 2) return null
        const values = sortedMonths.map(m => months[m] || 0)
        const recent = values.slice(-6)
        const projected = median(recent)
        const trend = trendDirection(recent.filter(v => v > 0))
        return { merchant, projected, trend, activeMonths: activeMonths.length }
      })
      .filter(Boolean)
      .filter(p => p.projected > 0.5)
      .sort((a, b) => b.projected - a.projected)
      .slice(0, 15)
  }, [spending, sortedMonths])

  const totalProjected = categoryProjections.reduce((sum, p) => sum + p.projected, 0)

  /* Chart: historical + projected for top categories */
  const chartData = useMemo(() => {
    if (sortedMonths.length < 2 || categoryProjections.length === 0) return null
    const displayMonths = [...sortedMonths.slice(-6), nextMonth]
    const topCats = categoryProjections.slice(0, 6)

    const datasets = topCats.map(cp => {
      const colour = getCategoryColour(cp.category)
      return {
        label: cp.category,
        data: displayMonths.map((m, i) => {
          if (i === displayMonths.length - 1) return cp.projected
          const mIdx = sortedMonths.indexOf(m)
          return mIdx >= 0 ? (cp.monthlyValues[mIdx] || 0) : 0
        }),
        backgroundColor: displayMonths.map((_, i) =>
          i === displayMonths.length - 1
            ? colour.replace(/[\d.]+\)$/, '0.35)')
            : colour
        ),
        borderColor: colour,
        borderWidth: displayMonths.map((_, i) => i === displayMonths.length - 1 ? 2 : 0),
        borderDash: displayMonths.map((_, i) => i === displayMonths.length - 1 ? [4, 4] : []),
      }
    })

    return {
      labels: displayMonths.map((m, i) => i === displayMonths.length - 1 ? `${formatMonth(m)} (proj.)` : formatMonth(m)),
      datasets,
    }
  }, [sortedMonths, categoryProjections, nextMonth])

  /* Not enough data */
  if (sortedMonths.length < 2) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">🔮</div>
        <h2>Not enough data for projections</h2>
        <p>At least 2 months of transactions are needed to generate spending projections.</p>
      </div>
    )
  }

  return (
    <div className="section-stack">
      {/* Header */}
      <div className="glass-panel glass-panel--accent kpi-card projections-header" style={{ textAlign: 'center' }}>
        <div className="kpi-label">
          Projected Spending — {formatMonth(nextMonth)}
          <InfoTooltip text="Projections use the median of up to 6 recent months (excluding months with zero spending in each category). This is more robust against outliers than a simple average." />
        </div>
        <div className="kpi-value kpi-value--danger text-mono">
          <span className="value-negative">£{totalProjected.toFixed(2)}</span>
        </div>
        <div className="kpi-sublabel">
          Based on {sortedMonths.length} month{sortedMonths.length !== 1 ? 's' : ''} of data ({formatMonth(sortedMonths[0])} – {formatMonth(sortedMonths[sortedMonths.length - 1])})
        </div>
      </div>

      {/* Chart */}
      {chartData && (
        <div className="glass-panel glass-panel--static chart-container">
          <h3>Category Spending — History + Projection</h3>
          <div className="chart-wrap">
            <Bar
              data={chartData}
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
                    callbacks: { label: ctx => `${ctx.dataset.label}: £${ctx.raw.toFixed(2)}` },
                  },
                },
                scales: {
                  x: {
                    stacked: true,
                    grid: { color: 'rgba(255,255,255,0.06)' },
                  },
                  y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { callback: v => `£${v}` },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Category projections table */}
      <div className="glass-panel glass-panel--static panel-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            📊 By Category
            <InfoTooltip text="Projected cost per category based on the median of recent monthly spending. Trend compares the last two months." />
          </h3>
          <div className="period-toggle">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`period-btn ${period === opt.value ? 'period-btn--active' : ''}`}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          {categoryProjections.map(cp => {
            const scaledProjected = cp.projected * periodMultiplier
            const scaledTotal = totalProjected * periodMultiplier
            const pct = scaledTotal > 0 ? ((scaledProjected / scaledTotal) * 100).toFixed(1) : 0
            return (
              <div key={cp.category} className="rank-row">
                <div className="rank-left">
                  <span className="rank-dot" style={{ backgroundColor: getCategoryColour(cp.category) }} aria-hidden="true" />
                  <span className="rank-name">{cp.category}</span>
                  <TrendBadge direction={cp.trend} />
                </div>
                <div className="rank-right">
                  <span className="rank-pct">{pct}%</span>
                  <span className="rank-amount">£{scaledProjected.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
        {periodMultiplier > 1 && (
          <p style={{ color: 'rgba(240,244,255,0.4)', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem' }}>
            {periodLabel} projections = monthly median × {periodMultiplier}
          </p>
        )}
      </div>

      {/* Merchant projections table */}
      <div className="glass-panel glass-panel--static panel-body">
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>
          🏪 By Merchant
          <InfoTooltip text="Top merchants by projected monthly cost (median). Only merchants appearing in 2+ months are included." />
        </h3>
        <div>
          {merchantProjections.map((mp, i) => (
            <div key={mp.merchant} className="rank-row">
              <div className="rank-left">
                <span className="rank-num">{i + 1}.</span>
                <span className="rank-name" style={{ textTransform: 'none' }}>{mp.merchant}</span>
                <TrendBadge direction={mp.trend} />
              </div>
              <div className="rank-right">
                <span className="rank-amount">£{mp.projected.toFixed(2)}/mo</span>
              </div>
            </div>
          ))}
          {merchantProjections.length === 0 && (
            <p style={{ color: 'rgba(240,244,255,0.4)', textAlign: 'center', padding: '1rem' }}>
              No merchants with enough recurring data to project.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
