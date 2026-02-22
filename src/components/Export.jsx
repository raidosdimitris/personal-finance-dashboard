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
   * Fix #7: Render chart to an offscreen canvas using Chart.js directly,
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

    // Income in green
    doc.setTextColor(34, 197, 94)
    doc.text(`Total Income: £${totalIncome.toFixed(2)}`, 14, 60)

    // Spending in red
    doc.setTextColor(239, 68, 68)
    doc.text(`Total Spending: £${totalSpending.toFixed(2)}`, 14, 66)

    // Net with explanation
    const netColor = net >= 0 ? [34, 197, 94] : [239, 68, 68]
    doc.setTextColor(...netColor)
    doc.text(`Net (Income - Spending): £${net.toFixed(2)}`, 14, 72)

    doc.setFontSize(9)
    if (net >= 0) {
      doc.setTextColor(34, 197, 94)
      doc.text(`You saved £${net.toFixed(2)}`, 14, 77)
    } else {
      doc.setTextColor(239, 68, 68)
      doc.text(`You overspent by £${Math.abs(net).toFixed(2)}`, 14, 77)
    }

    // Category breakdown
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.text('Spending by Category', 14, 90)

    const catBreakdown = {}
    spending.forEach((tx) => {
      catBreakdown[tx.category] = (catBreakdown[tx.category] || 0) + Math.abs(tx.amount)
    })

    const catRows = Object.entries(catBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => [cat, `£${amount.toFixed(2)}`])

    doc.autoTable({
      startY: 95,
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

    // Transaction table
    const txRows = transactions.slice(0, 50).map((tx) => [
      tx.date,
      tx.description.substring(0, 40),
      `£${tx.amount.toFixed(2)}`,
      tx.category,
    ])

    doc.addPage()
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Transactions (first 50)', 14, 20)

    doc.autoTable({
      startY: 25,
      head: [['Date', 'Description', 'Amount', 'Category']],
      body: txRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      didParseCell: (data) => {
        // Color amount cells: green for income, red for spending
        if (data.section === 'body' && data.column.index === 2) {
          const amountStr = data.cell.raw
          const amount = parseFloat(amountStr.replace('£', ''))
          if (amount >= 0) {
            data.cell.styles.textColor = [34, 197, 94]
          } else {
            data.cell.styles.textColor = [239, 68, 68]
          }
        }
      },
    })

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
