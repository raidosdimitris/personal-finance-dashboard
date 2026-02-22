import { useRef } from 'react'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

export default function Export({ transactions }) {
  const spending = transactions.filter((tx) => tx.amount < 0)
  const totalSpending = spending.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalIncome = transactions.filter((tx) => tx.amount >= 0).reduce((sum, tx) => sum + tx.amount, 0)

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

  const downloadChartPNG = (chartId, filename) => {
    const canvas = document.querySelector(`#${chartId} canvas`)
    if (!canvas) {
      alert('Chart not found. Please visit the Dashboard tab first.')
      return
    }
    const link = document.createElement('a')
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const downloadPDF = () => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.text('Personal Finance Report', 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28)

    // Summary
    doc.setFontSize(14)
    doc.text('Summary', 14, 40)
    doc.setFontSize(10)
    doc.text(`Total Transactions: ${transactions.length}`, 14, 48)
    doc.text(`Total Income: £${totalIncome.toFixed(2)}`, 14, 54)
    doc.text(`Total Spending: £${totalSpending.toFixed(2)}`, 14, 60)
    doc.text(`Net: £${(totalIncome - totalSpending).toFixed(2)}`, 14, 66)

    // Category breakdown
    const catBreakdown = {}
    spending.forEach((tx) => {
      catBreakdown[tx.category] = (catBreakdown[tx.category] || 0) + Math.abs(tx.amount)
    })

    doc.setFontSize(14)
    doc.text('Spending by Category', 14, 80)

    const catRows = Object.entries(catBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => [cat, `£${amount.toFixed(2)}`])

    doc.autoTable({
      startY: 85,
      head: [['Category', 'Amount']],
      body: catRows,
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
    doc.text('Transactions (first 50)', 14, 20)

    doc.autoTable({
      startY: 25,
      head: [['Date', 'Description', 'Amount', 'Category']],
      body: txRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
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
              Download charts as PNG images (visit Dashboard first)
            </p>
            <div className="space-y-2">
              <button
                onClick={() => downloadChartPNG('bar-chart', 'spending-over-time')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
              >
                Bar Chart PNG
              </button>
              <button
                onClick={() => downloadChartPNG('donut-chart', 'category-breakdown')}
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
              Generate a summary report with category breakdown
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
        </p>
      </div>
    </div>
  )
}
