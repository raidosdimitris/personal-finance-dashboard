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

function InfoTooltip({ text }) {
  return (
    <div className="relative group inline-block">
      <span className="ml-1 inline-block w-4 h-4 text-center text-xs rounded-full bg-gray-200 text-gray-600 leading-4 cursor-help">?</span>
      <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg">
        {text}
      </div>
    </div>
  )
}

export default function Dashboard({ transactions }) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedCategory, setSelectedCategory] = useState('all')
  const barRef = useRef(null)
  const donutRef = useRef(null)

  const categories = getAllCategories()

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (dateRange.start && tx.date < dateRange.start) return false
      if (dateRange.end && tx.date > dateRange.end) return false
      if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false
      return true
    })
  }, [transactions, dateRange, selectedCategory])

  // Spending only (negative amounts)
  const spending = filtered.filter((tx) => tx.amount < 0)
  const income = filtered.filter((tx) => tx.amount >= 0)

  const totalSpending = spending.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalIncome = income.reduce((sum, tx) => sum + tx.amount, 0)
  const net = totalIncome - totalSpending

  // Monthly data
  const monthlyData = useMemo(() => {
    const months = {}
    spending.forEach((tx) => {
      const month = tx.date?.substring(0, 7) || 'Unknown'
      months[month] = (months[month] || 0) + Math.abs(tx.amount)
    })
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
  }, [spending])

  // Category breakdown
  const categoryData = useMemo(() => {
    const cats = {}
    spending.forEach((tx) => {
      cats[tx.category] = (cats[tx.category] || 0) + Math.abs(tx.amount)
    })
    return Object.entries(cats).sort(([, a], [, b]) => b - a)
  }, [spending])

  // Top merchants
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

  // Recurring payments (same description appearing 2+ times)
  // Group by month for monthly breakdown
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

  // Previous month comparison
  const monthComparison = useMemo(() => {
    if (monthlyData.length < 2) return null
    const current = monthlyData[monthlyData.length - 1]
    const previous = monthlyData[monthlyData.length - 2]
    const diff = current[1] - previous[1]
    const pct = previous[1] > 0 ? ((diff / previous[1]) * 100).toFixed(1) : 0
    return { current: current[1], previous: previous[1], diff, pct, currentMonth: current[0], previousMonth: previous[0] }
  }, [monthlyData])

  // Chart data
  const barChartData = {
    labels: monthlyData.map(([m]) => m),
    datasets: [{
      label: 'Spending (£)',
      data: monthlyData.map(([, v]) => v),
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  }

  const donutChartData = {
    labels: categoryData.map(([c]) => c),
    datasets: [{
      data: categoryData.map(([, v]) => v),
      backgroundColor: categoryData.map(([c]) => getCategoryColour(c)),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📊</div>
        <h2 className="text-xl font-semibold text-gray-700">No data to display</h2>
        <p className="text-gray-500 mt-1">Upload and categorise transactions first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((r) => ({ ...r, start: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((r) => ({ ...r, end: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm capitalize"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setDateRange({ start: '', end: '' }); setSelectedCategory('all') }}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Spending</div>
          <div className="text-2xl font-bold text-red-600">£{totalSpending.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Income</div>
          <div className="text-2xl font-bold text-green-600">£{totalIncome.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">
            Net
            <InfoTooltip text="Net = Total Income minus Total Spending. Positive (green) means you saved money. Negative (red) means you spent more than you earned." />
          </div>
          <div className={`text-2xl font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            £{net.toFixed(2)}
          </div>
        </div>
        {monthComparison && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-500">
              vs Previous Month
              <InfoTooltip text={`Compares spending between ${monthComparison.currentMonth} and ${monthComparison.previousMonth}. Green = you spent less than last month. Red = you spent more.`} />
            </div>
            <div className={`text-2xl font-bold ${monthComparison.diff <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {monthComparison.diff > 0 ? '+' : ''}{monthComparison.pct}%
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Over Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Spending Over Time</h3>
          <div id="bar-chart">
            <Bar
              ref={barRef}
              data={barChartData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: (v) => `£${v}` } } },
              }}
            />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
          <div id="donut-chart" className="max-w-sm mx-auto">
            <Doughnut
              ref={donutRef}
              data={donutChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12 } },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: £${ctx.raw.toFixed(2)}` } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Top Merchants */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Top Merchants</h3>
        <div className="space-y-2">
          {topMerchants.map(([name, amount], i) => (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 w-6">{i + 1}.</span>
                <span className="text-sm font-medium">{name}</span>
              </div>
              <span className="text-sm text-gray-900 font-semibold">£{amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recurring Payments */}
      {recurring.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">🔄 Recurring Payments</h3>
          <div className="space-y-2">
            {recurring.map((r) => (
              <div key={r.description} className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{r.description}</span>
                  <span className="text-xs text-gray-400 ml-2">({r.count} times)</span>
                </div>
                <span className="text-sm text-gray-900 font-semibold">
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
