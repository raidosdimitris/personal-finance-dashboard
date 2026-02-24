import { useMemo } from 'react'
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
 * Weighted moving average — recent months count more.
 * With 3 months: weights [1, 2, 3] (most recent = 3).
 * Falls back to simple average if fewer than 2 months.
 */
function weightedAverage(values) {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]
  const weights = values.map((_, i) => i + 1)
  const totalWeight = weights.reduce((a, b) => a + b, 0)
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight
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

export default function Projections({ transactions }) {
  const spending = useMemo(() => transactions.filter(tx => tx.amount < 0), [transactions])

  const sortedMonths = useMemo(() => {
    const monthSet = new Set()
    spending.forEach(tx => {
      const m = tx.date?.substring(0, 7)
      if (m) monthSet.add(m)
    })
    return [...monthSet].sort()
  }, [spending])

  const nextMonth = sortedMonths.length > 0 ? getNextMonth(sortedMonths[sortedMonths.length - 1]) : null

  /* Category projections */
  const categoryProjections = useMemo(() => {
    if (sortedMonths.length < 2) return []
    const catMonthly = {}
    spending.forEach(tx => {
      const m = tx.date?.substring(0, 7)
      if (!m) return
      if (!catMonthly[tx.category]) catMonthly[tx.category] = {}
      catMonthly[tx.category][m] = (catMonthly[tx.category][m] || 0) + Math.abs(tx.amount)
    })

    return Object.entries(catMonthly)
      .map(([cat, months]) => {
        const values = sortedMonths.map(m => months[m] || 0)
        // Use last 6 months max for projection
        const recent = values.slice(-6)
        const projected = weightedAverage(recent)
        const trend = trendDirection(recent)
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length
        return { category: cat, projected, trend, avg, monthlyValues: values }
      })
      .filter(p => p.projected > 0.5) // skip negligible
      .sort((a, b) => b.projected - a.projected)
  }, [spending, sortedMonths])

  /* Merchant projections */
  const merchantProjections = useMemo(() => {
    if (sortedMonths.length < 2) return []
    const merchMonthly = {}
    spending.forEach(tx => {
      const m = tx.date?.substring(0, 7)
      const name = tx.description || 'Unknown'
      if (!m) return
      if (!merchMonthly[name]) merchMonthly[name] = {}
      merchMonthly[name][m] = (merchMonthly[name][m] || 0) + Math.abs(tx.amount)
    })

    return Object.entries(merchMonthly)
      .map(([merchant, months]) => {
        const activeMonths = sortedMonths.filter(m => months[m] > 0)
        if (activeMonths.length < 2) return null
        const values = sortedMonths.map(m => months[m] || 0)
        const recent = values.slice(-6)
        const projected = weightedAverage(recent)
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
      <div className="glass-panel glass-panel--accent kpi-card" style={{ textAlign: 'center' }}>
        <div className="kpi-label">
          Projected Spending — {formatMonth(nextMonth)}
          <InfoTooltip text="Projections use a weighted moving average of up to 6 recent months. More recent months are weighted higher. This is a simple statistical estimate, not a guarantee." />
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
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>
          📊 By Category
          <InfoTooltip text="Projected monthly cost per category based on weighted moving average. Trend compares the last two months." />
        </h3>
        <div>
          {categoryProjections.map(cp => {
            const pct = totalProjected > 0 ? ((cp.projected / totalProjected) * 100).toFixed(1) : 0
            return (
              <div key={cp.category} className="rank-row">
                <div className="rank-left">
                  <span className="rank-dot" style={{ backgroundColor: getCategoryColour(cp.category) }} aria-hidden="true" />
                  <span className="rank-name">{cp.category}</span>
                  <TrendBadge direction={cp.trend} />
                </div>
                <div className="rank-right">
                  <span className="rank-pct">{pct}%</span>
                  <span className="rank-amount">£{cp.projected.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Merchant projections table */}
      <div className="glass-panel glass-panel--static panel-body">
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>
          🏪 By Merchant
          <InfoTooltip text="Top merchants by projected monthly cost. Only merchants appearing in 2+ months are included." />
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
