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
 * Compute trend direction and monetary delta between last two periods.
 * Returns { direction: +1|-1|0, delta: number }
 */
function trendDirection(values) {
  if (values.length < 2) return { direction: 0, delta: 0 }
  const recent = values[values.length - 1]
  const prev = values[values.length - 2]
  const delta = recent - prev
  if (prev === 0) return { direction: recent > 0 ? 1 : 0, delta }
  const pct = ((recent - prev) / prev) * 100
  if (Math.abs(pct) < 5) return { direction: 0, delta }
  return { direction: pct > 0 ? 1 : -1, delta }
}

function TrendBadge({ direction, delta }) {
  const absDelta = Math.abs(delta || 0)
  const deltaStr = absDelta > 0.01 ? `£${absDelta.toFixed(2)}` : ''
  if (direction === 1) return <span className="trend-badge trend-up">↑ Rising {deltaStr && <span style={{ color: '#ff6b6b' }}>+{deltaStr}</span>}</span>
  if (direction === -1) return <span className="trend-badge trend-down">↓ Falling {deltaStr && <span style={{ color: '#51cf66' }}>-{deltaStr}</span>}</span>
  return <span className="trend-badge trend-stable">→ Stable</span>
}

const LOOKBACK_OPTIONS = [
  { value: '30d', label: '30d', days: 30 },
  { value: '90d', label: '90d', days: 90 },
  { value: '12m', label: '12m', days: 365 },
]

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Monthly', days: 30.44 },
  { value: 'quarter', label: 'Quarterly', days: 91.31 },
  { value: 'year', label: 'Yearly', days: 365 },
]

const PERIOD_SUFFIX = { month: '/mo', quarter: '/qtr', year: '/yr' }

export default function Projections({ transactions }) {
  const [period, setPeriod] = useState('month')
  const [lookback, setLookback] = useState('90d')
  const spending = useMemo(() => transactions.filter(tx => tx.amount < 0), [transactions])

  const today = useMemo(() => new Date(), [])

  const lookbackDays = LOOKBACK_OPTIONS.find(o => o.value === lookback).days
  const periodDays = PERIOD_OPTIONS.find(o => o.value === period).days
  const periodSuffix = PERIOD_SUFFIX[period]
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period).label

  // Parse all spending transactions with proper Date objects
  const parsedSpending = useMemo(() => {
    return spending.map(tx => {
      const d = tx.date
      if (!d || typeof d !== 'string') return null
      const dateObj = new Date(d)
      if (isNaN(dateObj.getTime())) return null
      return { ...tx, dateObj }
    }).filter(Boolean)
  }, [spending])

  // Sorted months for chart history
  const sortedMonths = useMemo(() => {
    const monthSet = new Set()
    parsedSpending.forEach(tx => {
      const y = tx.dateObj.getFullYear()
      const m = String(tx.dateObj.getMonth() + 1).padStart(2, '0')
      monthSet.add(`${y}-${m}`)
    })
    return [...monthSet].sort()
  }, [parsedSpending])

  const nextMonth = sortedMonths.length > 0 ? getNextMonth(sortedMonths[sortedMonths.length - 1]) : null

  // Daily-rate projection engine
  const computeProjections = useMemo(() => {
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - lookbackDays)

    const windowTxs = parsedSpending.filter(tx => tx.dateObj >= cutoff && tx.dateObj <= today)

    // Group by category
    const catTotals = {}
    const merchTotals = {}
    // Also track monthly values for chart + trend
    const catMonthly = {}
    const merchMonthly = {}

    parsedSpending.forEach(tx => {
      const y = tx.dateObj.getFullYear()
      const m = String(tx.dateObj.getMonth() + 1).padStart(2, '0')
      const ym = `${y}-${m}`
      const amt = Math.abs(tx.amount)
      const cat = tx.category
      const merch = tx.description || 'Unknown'

      if (!catMonthly[cat]) catMonthly[cat] = {}
      catMonthly[cat][ym] = (catMonthly[cat][ym] || 0) + amt
      if (!merchMonthly[merch]) merchMonthly[merch] = {}
      merchMonthly[merch][ym] = (merchMonthly[merch][ym] || 0) + amt
    })

    windowTxs.forEach(tx => {
      const amt = Math.abs(tx.amount)
      const cat = tx.category
      const merch = tx.description || 'Unknown'
      catTotals[cat] = (catTotals[cat] || 0) + amt
      merchTotals[merch] = (merchTotals[merch] || 0) + amt
    })

    const catProjections = Object.entries(catTotals).map(([cat, total]) => {
      const dailyRate = total / lookbackDays
      const projected = dailyRate * periodDays
      const values = sortedMonths.map(m => catMonthly[cat]?.[m] || 0)
      const recent = values.slice(-6)
      const { direction, delta } = trendDirection(recent)
      return { category: cat, projected, trend: direction, trendDelta: delta, monthlyValues: values }
    }).sort((a, b) => b.projected - a.projected)

    const merchProjections = Object.entries(merchTotals).map(([merchant, total]) => {
      const dailyRate = total / lookbackDays
      const projected = dailyRate * periodDays
      const values = sortedMonths.map(m => merchMonthly[merchant]?.[m] || 0)
      const activeMonths = values.filter(v => v > 0).length
      if (activeMonths < 2) return null
      const recent = values.slice(-6).filter(v => v > 0)
      const { direction, delta } = trendDirection(recent)
      return { merchant, projected, trend: direction, trendDelta: delta, activeMonths }
    }).filter(Boolean).sort((a, b) => b.projected - a.projected)

    return { catProjections, merchProjections, catMonthly }
  }, [parsedSpending, today, lookbackDays, periodDays, sortedMonths])

  const { catProjections, merchProjections, catMonthly } = computeProjections
  const totalProjected = catProjections.reduce((sum, p) => sum + p.projected, 0)

  /* Chart: historical monthly bars + projected bar */
  const chartData = useMemo(() => {
    if (sortedMonths.length < 2 || catProjections.length === 0) return null
    const displayMonths = [...sortedMonths.slice(-6), nextMonth]
    const topCats = catProjections.slice(0, 6)

    const datasets = topCats.map(cp => {
      const colour = getCategoryColour(cp.category)
      return {
        label: cp.category,
        data: displayMonths.map((m, i) => {
          if (i === displayMonths.length - 1) return cp.projected
          const monthly = catMonthly[cp.category]
          return monthly?.[m] || 0
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
  }, [sortedMonths, catProjections, nextMonth, catMonthly])

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

  const lookbackLabel = LOOKBACK_OPTIONS.find(o => o.value === lookback).label

  const ToggleBar = ({ showLookback = true, showPeriod = true }) => (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {showLookback && (
        <div className="period-toggle">
          {LOOKBACK_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`period-btn ${lookback === opt.value ? 'period-btn--active' : ''}`}
              onClick={() => setLookback(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {showPeriod && (
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
      )}
    </div>
  )

  return (
    <div className="section-stack">
      {/* Header */}
      <div className="glass-panel glass-panel--accent kpi-card projections-header" style={{ textAlign: 'center' }}>
        <div className="kpi-label">
          Projected {periodLabel} Spending — {formatMonth(nextMonth)}
          <InfoTooltip text={`Projections use a daily-rate model: total spending in the ${lookbackLabel} window ÷ calendar days, then scaled to the selected period. Change the lookback window and period below.`} />
        </div>
        <div className="kpi-value kpi-value--danger text-mono">
          <span className="value-negative">£{totalProjected.toFixed(2)}</span>
        </div>
        <div className="kpi-sublabel">
          Based on {lookbackLabel} lookback window • {sortedMonths.length} months of data ({formatMonth(sortedMonths[0])} – {formatMonth(sortedMonths[sortedMonths.length - 1])})
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <ToggleBar />
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
            <InfoTooltip text={`Projected cost per category using daily-rate model over ${lookbackLabel} window, scaled to ${periodLabel.toLowerCase()} period. Trend compares the last two months.`} />
          </h3>
        </div>
        <div>
          {catProjections.map(cp => {
            const pct = totalProjected > 0 ? ((cp.projected / totalProjected) * 100).toFixed(1) : 0
            return (
              <div key={cp.category} className="rank-row">
                <div className="rank-left">
                  <span className="rank-dot" style={{ backgroundColor: getCategoryColour(cp.category) }} aria-hidden="true" />
                  <span className="rank-name">{cp.category}</span>
                  <TrendBadge direction={cp.trend} delta={cp.trendDelta} />
                </div>
                <div className="rank-right">
                  <span className="rank-pct">{pct}%</span>
                  <span className="rank-amount">£{cp.projected.toFixed(2)}{periodSuffix}</span>
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
          <InfoTooltip text={`Merchants by projected ${periodLabel.toLowerCase()} cost using daily-rate model over ${lookbackLabel} window. Only merchants appearing in 2+ months are included.`} />
        </h3>
        <div>
          {merchProjections.map((mp, i) => (
            <div key={mp.merchant} className="rank-row">
              <div className="rank-left">
                <span className="rank-num">{i + 1}.</span>
                <span className="rank-name" style={{ textTransform: 'none' }}>{mp.merchant}</span>
                <TrendBadge direction={mp.trend} delta={mp.trendDelta} />
              </div>
              <div className="rank-right">
                <span className="rank-amount">£{mp.projected.toFixed(2)}{periodSuffix}</span>
              </div>
            </div>
          ))}
          {merchProjections.length === 0 && (
            <p style={{ color: 'rgba(240,244,255,0.4)', textAlign: 'center', padding: '1rem' }}>
              No merchants with enough recurring data to project.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
