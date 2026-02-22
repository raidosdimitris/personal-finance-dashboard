import { useMemo } from 'react'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
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
import { getCategoryColour } from '../utils/categoriser'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

export default function Export({ transactions }) {
  const spending = transactions.filter((tx) => tx.amount < 0)
  const totalSpending = spending.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalIncome = transactions.filter((tx) => tx.amount >= 0).reduce((sum, tx) => sum + tx.amount, 0)
  const net = totalIncome - totalSpending

  // Compute chart data for offscreen rendering
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

  // Timeframe
  const timeframe = useMemo(() => {
    const dates = transactions.map((tx) => tx.date).filter(Boolean).sort()
    if (dates.length === 0) return null
    return { earliest: dates[0], latest: dates[dates.length - 1] }
  }, [transactions])

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

  const downloadCSV = () => {
    const data = transactions.map((tx) => ({
      Date: tx.date,
      Description: tx.description,
      Amount: tx.amount.toFixed(2),
      Category: tx.category,
      Bank: tx.bank,
    }))
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finance-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Render chart to an offscreen canvas using Chart.js directly,
   * so export works even when Dashboard tab is not mounted.
   */
  const downloadChartPNG = (chartType, filename) => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 400

    const data = chartType === 'bar' ? barChartData : donutChartData
    const options = chartType === 'bar'
      ? {
          responsive: false,
          animation: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => `£${v}` } } },
        }
      : {
          responsive: false,
          animation: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12 } },
          },
        }

    const chart = new ChartJS(canvas, {
      type: chartType === 'bar' ? 'bar' : 'doughnut',
      data,
      options,
    })

    const link = document.createElement('a')
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    chart.destroy()
  }

  /**
   * Render a chart to an offscreen canvas and return its data URL.
   */
  const renderChartToDataURL = (chartType, width, height) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const data = chartType === 'bar' ? barChartData : donutChartData
    const options = chartType === 'bar'
      ? {
          responsive: false,
          animation: false,
          plugins: { legend: { display: false }, title: { display: true, text: 'Spending Over Time' } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => `£${v}` } } },
        }
      : {
          responsive: false,
          animation: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12 } },
            title: { display: true, text: 'Category Breakdown' },
          },
        }

    const chart = new ChartJS(canvas, {
      type: chartType === 'bar' ? 'bar' : 'doughnut',
      data,
      options,
    })

    const dataURL = canvas.toDataURL('image/png')
    chart.destroy()
    return dataURL
  }

  const downloadPDF = () => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.text('Personal Finance Report', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)

    // Timeframe
    if (timeframe) {
      doc.text(`Timeframe: ${timeframe.earliest} to ${timeframe.latest}`, 14, 34)
    }

    // Summary
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Summary', 14, 46)
    doc.setFontSize(10)
    doc.text(`Total Transactions: ${transactions.length}`, 14, 54)

    // Income — label in black, value in green
    const incomeLabel = 'Total Income: '
    doc.setTextColor(0, 0, 0)
    doc.text(incomeLabel, 14, 60)
    const incomeLabelWidth = doc.getTextWidth(incomeLabel)
    doc.setTextColor(34, 197, 94)
    doc.text(`£${totalIncome.toFixed(2)}`, 14 + incomeLabelWidth, 60)

    // Spending — label in black, value in red
    const spendingLabel = 'Total Spending: '
    doc.setTextColor(0, 0, 0)
    doc.text(spendingLabel, 14, 66)
    const spendingLabelWidth = doc.getTextWidth(spendingLabel)
    doc.setTextColor(239, 68, 68)
    doc.text(`£${totalSpending.toFixed(2)}`, 14 + spendingLabelWidth, 66)

    // Net — label in black, value in green/red
    const netLabel = 'Net (Income - Spending): '
    const netColor = net >= 0 ? [34, 197, 94] : [239, 68, 68]
    doc.setTextColor(0, 0, 0)
    doc.text(netLabel, 14, 72)
    const netLabelWidth = doc.getTextWidth(netLabel)
    doc.setTextColor(...netColor)
    doc.text(`£${net.toFixed(2)}`, 14 + netLabelWidth, 72)

    // "You saved" / "You overspent" line — font size 10 to match
    doc.setFontSize(10)
    if (net >= 0) {
      const savedLabel = 'You saved '
      doc.setTextColor(0, 0, 0)
      doc.text(savedLabel, 14, 78)
      const savedLabelWidth = doc.getTextWidth(savedLabel)
      doc.setTextColor(34, 197, 94)
      doc.text(`£${net.toFixed(2)}`, 14 + savedLabelWidth, 78)
    } else {
      const overspentLabel = 'You overspent by '
      doc.setTextColor(0, 0, 0)
      doc.text(overspentLabel, 14, 78)
      const overspentLabelWidth = doc.getTextWidth(overspentLabel)
      doc.setTextColor(239, 68, 68)
      doc.text(`£${Math.abs(net).toFixed(2)}`, 14 + overspentLabelWidth, 78)
    }

    // Category breakdown
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.text('Spending by Category', 14, 92)

    const catBreakdown = {}
    spending.forEach((tx) => {
      catBreakdown[tx.category] = (catBreakdown[tx.category] || 0) + Math.abs(tx.amount)
    })

    const catRows = Object.entries(catBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => [cat, `£${amount.toFixed(2)}`])

    doc.autoTable({
      startY: 97,
      head: [['Category', 'Amount']],
      body: catRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    })

    // Top 10 Merchants
    let currentY = doc.lastAutoTable.finalY + 10
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Top 10 Merchants', 14, currentY)

    const merchantRows = topMerchants.map(([name, amount], i) => [
      `${i + 1}.`,
      name.substring(0, 40),
      `£${amount.toFixed(2)}`,
    ])

    doc.autoTable({
      startY: currentY + 5,
      head: [['#', 'Merchant', 'Amount']],
      body: merchantRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    })

    // Charts page
    doc.addPage()
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Charts', 14, 20)

    try {
      const barDataURL = renderChartToDataURL('bar', 600, 300)
      doc.addImage(barDataURL, 'PNG', 14, 28, 180, 90)

      const donutDataURL = renderChartToDataURL('doughnut', 600, 300)
      doc.addImage(donutDataURL, 'PNG', 14, 128, 180, 90)
    } catch (e) {
      doc.setFontSize(10)
      doc.text('Charts could not be rendered.', 14, 30)
    }

    doc.save(`finance-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">💾</div>
        <h2 className="text-xl font-semibold text-gray-700">No data to export</h2>
        <p className="text-gray-500 mt-1">Upload and categorise transactions first</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-6">Export Your Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CSV Export */}
          <div className="border border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="font-semibold text-gray-900">CSV Export</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Download cleaned & categorised transactions as a CSV file
            </p>
            <button
              onClick={downloadCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Download CSV
            </button>
          </div>

          {/* Chart PNG */}
          <div className="border border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-gray-900">Chart Images</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Download charts as PNG images
            </p>
            <div className="space-y-2">
              <button
                onClick={() => downloadChartPNG('bar', 'spending-over-time')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                Bar Chart PNG
              </button>
              <button
                onClick={() => downloadChartPNG('doughnut', 'category-breakdown')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
              >
                Donut Chart PNG
              </button>
            </div>
          </div>

          {/* PDF Report */}
          <div className="border border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
            <div className="text-3xl mb-3">📑</div>
            <h3 className="font-semibold text-gray-900">PDF Report</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Generate a detailed summary report
            </p>
            <button
              onClick={downloadPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
        <p>
          📊 <strong>{transactions.length}</strong> transactions ready to export •
          Income: <strong className="text-green-600">£{totalIncome.toFixed(2)}</strong> •
          Spending: <strong className="text-red-600">£{totalSpending.toFixed(2)}</strong>
          {timeframe && (
            <span> • Period: <strong>{timeframe.earliest}</strong> to <strong>{timeframe.latest}</strong></span>
          )}
        </p>
      </div>
    </div>
  )
}
