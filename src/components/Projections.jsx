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

function formatQuarter(yq) {
  if (!yq || typeof yq !== 'string') return yq || ''
  const [year, q] = yq.split('-Q')
  return `Q${q} ${year}`
}

function getNextMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  return `${nextY}-${String(nextM).padStart(2, '0')}`
}

function getNextQuarter(yq) {
  const [y, q] = yq.split('-Q').map(Number)
  const nextQ = q === 4 ? 1 : q + 1
  const nextY = q === 4 ? y + 1 : y
  return `${nextY}-Q${nextQ}`
}

function getNextYear(y) {
  return String(Number(y) + 1)
}

/**
 * Compute trend direction and monetary delta between last two periods.
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

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Monthly', days: 30.44, lookbackDays: 30 },
  { value: 'quarter', label: 'Quarterly', days: 91.31, lookbackDays: 90 },
  { value: 'year', label: 'Yearly', days: 365, lookbackDays: 365 },
]

const PROJECTION_FORMULA_TOOLTIP = `How projections are calculated:

1. A lookback window is selected based on the period (30 days for monthly, 90 days for quarterly, 365 days for yearly).
2. All spending within that window is summed per category/merchant.
3. A daily spending rate is calculated: total ÷ number of days in the window.
4. The projection is: daily rate × target period days (30.44 for a month, 91.31 for a quarter, 365 for a year).

Trend compares the last two completed months.`

export default function Projections({ transactions }) {
  const [period, setPeriod] = useState('month')
  const spending = useMemo(() => transactions.filter(tx => tx.amount < 0), [transactions])
  const today = useMemo(() => new Date(), [])

  const periodConfig = PERIOD_OPTIONS.find(o => o.value === period)
  const { days: periodDays, lookbackDays, label: periodLabel } = periodConfig

  // Parse all spending transactions with Date objects
  const parsedSpending = useMemo(() => {
    return spending.map(tx => {
      const d = tx.date
      if (!d || typeof d !== 'string') return null
      const dateObj = new Date(d)
      if (isNaN(dateObj.getTime())) return null
      return { ...tx, dateObj }
    }).filter(Boolean)
  }, [spending])

  // All unique categories from ALL transactions (not just the window)
  const allCategories = useMemo(() => {
    const cats = new Set()
    transactions.forEach(tx => { if (tx.category) cats.add(tx.category) })
    return [...cats].sort()
  }, [transactions])

  // All unique merchants with 2+ months of activity (from ALL data)
  const allMerchants = useMemo(() => {
    const merchMonths = {}
    parsedSpending.forEach(tx => {
      const name = tx.description || 'Unknown'
      if (!merchMonths[name]) merchMonths[name] = new Set()
      const y = tx.dateObj.getFullYear()
      const m = String(tx.dateObj.getMonth() + 1).padStart(2, '0')
      merchMonths[name].add(`${y}-${m}`)
    })
    return Object.entries(merchMonths)
      .filter(([, months]) => months.size >= 2)
      .map(([name]) => name)
      .sort()
  }, [parsedSpending])

  // Helper: get period bucket for a date
  const getBucket = (dateObj) => {
    const y = dateObj.getFullYear()
    const m = dateObj.getMonth() + 1
    if (period === 'month') return `${y}-${String(m).padStart(2, '0')}`
    if (period === 'quarter') return `${y}-Q${Math.ceil(m / 3)}`
    return String(y)
  }

  const formatBucket = (bucket) => {
    if (period === 'month') return formatMonth(bucket)
    if (period === 'quarter') return formatQuarter(bucket)
    return bucket
  }

  const getNextBucket = (bucket) => {
    if (period === 'month') return getNextMonth(bucket)
    if (period === 'quarter') return getNextQuarter(bucket)
    return getNextYear(bucket)
  }

  // Sorted period buckets
  const sortedBuckets = useMemo(() => {
    const bucketSet = new Set()
    parsedSpending.forEach(tx => bucketSet.add(getBucket(tx.dateObj)))
    return [...bucketSet].sort()
  }, [parsedSpending, period])

  const nextBucket = sortedBuckets.length > 0 ? getNextBucket(sortedBuckets[sortedBuckets.length - 1]) : null

  // Precompute category monthly data (always monthly, for trends)
  const catMonthly = useMemo(() => {
    const data = {}
    parsedSpending.forEach(tx => {
      const y = tx.dateObj.getFullYear()
      const m = String(tx.dateObj.getMonth() + 1).padStart(2, '0')
      const ym = `${y}-${m}`
      const cat = tx.category
      if (!data[cat]) data[cat] = {}
      data[cat][ym] = (data[cat][ym] || 0) + Math.abs(tx.amount)
    })
    return data
  }, [parsedSpending])

  // Precompute category bucket data (for chart x-axis based on period)
  const catBucketData = useMemo(() => {
    const data = {}
    parsedSpending.forEach(tx => {
      const bucket = getBucket(tx.dateObj)
      const cat = tx.category
      if (!data[cat]) data[cat] = {}
      data[cat][bucket] = (data[cat][bucket] || 0) + Math.abs(tx.amount)
    })
    return data
  }, [parsedSpending, period])

  // Precompute merchant monthly data (for trends)
  const merchMonthly = useMemo(() => {
    const data = {}
    parsedSpending.forEach(tx => {
      const name = tx.description || 'Unknown'
      if (!data[name]) data[name] = {}
      const y = tx.dateObj.getFullYear()
      const m = String(tx.dateObj.getMonth() + 1).padStart(2, '0')
      const ym = `${y}-${m}`
      data[name][ym] = (data[name][ym] || 0) + Math.abs(tx.amount)
    })
    return data
  }, [parsedSpending])

  // Sorted months (for trend calculations)
  const sortedMonths = useMemo(() => {
    const monthSet = new Set()
    parsedSpending.forEach(tx => {
      const y = tx.dateObj.getFullYear()
      const m = String(tx.dateObj.getMonth() + 1).padStart(2, '0')
      monthSet.add(`${y}-${m}`)
    })
    return [...monthSet].sort()
  }, [parsedSpending])

  // Daily-rate projection engine
  const projections = useMemo(() => {
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() - lookbackDays)

    const windowTxs = parsedSpending.filter(tx => tx.dateObj >= cutoff && tx.dateObj <= today)

    // Sum by category and merchant in window
    const catWindowTotals = {}
    const merchWindowTotals = {}
    windowTxs.forEach(tx => {
      const amt = Math.abs(tx.amount)
      catWindowTotals[tx.category] = (catWindowTotals[tx.category] || 0) + amt
      const merch = tx.description || 'Unknown'
      merchWindowTotals[merch] = (merchWindowTotals[merch] || 0) + amt
    })

    // Category projections — ALL categories, sorted largest to smallest
    const catProjections = allCategories.map(cat => {
      const total = catWindowTotals[cat] || 0
      const dailyRate = total / lookbackDays
      const projected = dailyRate * periodDays
      const monthlyValues = sortedMonths.map(m => catMonthly[cat]?.[m] || 0)
      const recent = monthlyValues.slice(-6)
      const { direction, delta } = trendDirection(recent)
      const bucketValues = sortedBuckets.map(b => catBucketData[cat]?.[b] || 0)
      return { category: cat, projected, trend: direction, trendDelta: delta, bucketValues }
    }).sort((a, b) => b.projected - a.projected)

    // Merchant projections — ALL qualifying merchants, sorted largest to smallest
    const merchProjections = allMerchants.map(merchant => {
      const total = merchWindowTotals[merchant] || 0
      const dailyRate = total / lookbackDays
      const projected = dailyRate * periodDays
      const monthlyValues = sortedMonths.map(m => merchMonthly[merchant]?.[m] || 0)
      const recent = monthlyValues.slice(-6).filter(v => v > 0)
      const { direction, delta } = trendDirection(recent)
      return { merchant, projected, trend: direction, trendDelta: delta }
    }).sort((a, b) => b.projected - a.projected)

    return { catProjections, merchProjections }
  }, [parsedSpending, today, lookbackDays, periodDays, allCategories, allMerchants, sortedMonths, catMonthly, sortedBuckets, catBucketData, merchMonthly])

  const { catProjections, merchProjections } = projections
  const totalProjected = catProjections.reduce((sum, p) => sum + p.projected, 0)

  /* Chart: historical buckets + projected bar for ALL categories */
  const chartData = useMemo(() => {
    if (sortedBuckets.length < 2 || catProjections.length === 0) return null
    const displayBuckets = [...sortedBuckets.slice(-6), nextBucket]

    const datasets = catProjections
      .filter(cp => cp.projected > 0 || cp.bucketValues.some(v => v > 0))
      .map(cp => {
        const colour = getCategoryColour(cp.category)
        return {
          label: cp.category,
          data: displayBuckets.map((b, i) => {
            if (i === displayBuckets.length - 1) return cp.projected
            const bIdx = sortedBuckets.indexOf(b)
            return bIdx >= 0 ? (cp.bucketValues[bIdx] || 0) : 0
          }),
          backgroundColor: displayBuckets.map((_, i) =>
            i === displayBuckets.length - 1
              ? colour.replace(/[\d.]+\)$/, '0.35)')
              : colour
          ),
          borderColor: colour,
          borderWidth: displayBuckets.map((_, i) => i === displayBuckets.length - 1 ? 2 : 0),
          borderDash: displayBuckets.map((_, i) => i === displayBuckets.length - 1 ? [4, 4] : []),
        }
      })

    return {
      labels: displayBuckets.map((b, i) => i === displayBuckets.length - 1 ? `${formatBucket(b)} (proj.)` : formatBucket(b)),
      datasets,
    }
  }, [sortedBuckets, catProjections, nextBucket, period])

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
          Projected {periodLabel} Spending — {formatBucket(nextBucket)}
          <InfoTooltip text={PROJECTION_FORMULA_TOOLTIP} />
        </div>
        <div className="kpi-value kpi-value--danger text-mono">
          <span className="value-negative">£{totalProjected.toFixed(2)}</span>
        </div>
        <div className="kpi-sublabel">
          Based on {lookbackDays}-day lookback • {sortedMonths.length} months of data ({formatMonth(sortedMonths[0])} – {formatMonth(sortedMonths[sortedMonths.length - 1])})
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
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

      {/* Category projections */}
      <div className="glass-panel glass-panel--static panel-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>
            📊 By Category
            <InfoTooltip text={`Projected cost per category. Daily rate (from ${lookbackDays}-day window) × ${periodDays} days. All categories shown — £0.00 means no spending detected in the lookback window.`} />
          </h3>
        </div>
        <div>
          {catProjections.map(cp => {
            const pct = totalProjected > 0 ? ((cp.projected / totalProjected) * 100).toFixed(1) : '0.0'
            return (
              <div key={cp.category} className="rank-row">
                <div className="rank-left">
                  <span className="rank-dot" style={{ backgroundColor: getCategoryColour(cp.category) }} aria-hidden="true" />
                  <span className="rank-name">{cp.category}</span>
                  <TrendBadge direction={cp.trend} delta={cp.trendDelta} />
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

      {/* Merchant projections */}
      <div className="glass-panel glass-panel--static panel-body">
        <h3 className="section-title" style={{ marginBottom: '1rem' }}>
          🏪 By Merchant
          <InfoTooltip text={`Merchants by projected ${periodLabel.toLowerCase()} cost. Same daily-rate formula applied. Only merchants with 2+ months of activity are shown.`} />
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
                <span className="rank-amount">£{mp.projected.toFixed(2)}</span>
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
