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
  /* ============ ALL LOGIC PRESERVED EXACTLY ============ */
  const spending = transactions.filter((tx) => tx.amount < 0)
  const totalSpending = spending.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const totalIncome = transactions.filter((tx) => tx.amount >= 0).reduce((sum, tx) => sum + tx.amount, 0)
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

  /* CSV formula injection protection: prefix dangerous characters */
  const sanitizeCellValue = (value) => {
    if (typeof value !== 'string') return value
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
    if (dangerousChars.some((ch) => value.startsWith(ch))) {
      return "'" + value
    }
    return value
  }

  const downloadCSV = () => {
    const rawData = transactions.map((tx) => ({
      Date: tx.date,
      Description: tx.description,
      Amount: tx.amount.toFixed(2),
      Category: tx.category,
      Bank: tx.bank,
    }))
    /* Sanitize all string values to prevent formula injection in spreadsheet apps */
    const data = rawData.map((row) => {
      const sanitized = {}
      for (const [key, val] of Object.entries(row)) {
        sanitized[key] = sanitizeCellValue(val)
      }
      return sanitized
    })
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `finance-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  /* ============ CHART HELPER: percentage label plugin ============ */
  const percentageLabelPlugin = {
    id: 'percentageLabels',
    afterDraw(chart) {
      if (chart.config.type !== 'doughnut') return
      const { ctx } = chart
      const meta = chart.getDatasetMeta(0)
      const total = meta.total || chart.data.datasets[0].data.reduce((a, b) => a + b, 0)

      meta.data.forEach((arc, i) => {
        const value = chart.data.datasets[0].data[i]
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0
        if (pct < 3) return

        const { x, y } = arc.tooltipPosition()
        ctx.save()
        /* White text with dark shadow for readability on any slice colour */
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 3
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 11px Helvetica, Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${pct}%`, x, y)
        ctx.restore()
      })
    },
  }

  /* ============ CHART HELPER: white background plugin ============ */
  const whiteBackgroundPlugin = {
    id: 'whiteBackground',
    beforeDraw(chart) {
      const { ctx, width, height } = chart
      ctx.save()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.restore()
    },
  }

  /* ============ SHARED CHART OPTIONS FOR EXPORT (dark text on white bg) ============ */
  const exportBarOptions = (showTitle) => ({
    responsive: false,
    animation: false,
    plugins: {
      legend: { display: false },
      title: showTitle
        ? { display: true, text: 'Spending Over Time', color: '#1e293b', font: { size: 14, weight: 'bold' } }
        : { display: false },
    },
    scales: {
      x: {
        ticks: { color: '#334155', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        beginAtZero: true,
        ticks: { color: '#334155', font: { size: 11 }, callback: (v) => `£${v}` },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
  })

  const exportDonutOptions = (showTitle) => ({
    responsive: false,
    animation: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, color: '#1e293b', font: { size: 11 } },
      },
      title: showTitle
        ? { display: true, text: 'Category Breakdown', color: '#1e293b', font: { size: 14, weight: 'bold' } }
        : { display: false },
    },
  })

  const downloadChartPNG = (chartType, filename) => {
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 400

    const data = chartType === 'bar' ? barChartData : donutChartData
    const options = chartType === 'bar' ? exportBarOptions(true) : exportDonutOptions(true)
    const plugins = [whiteBackgroundPlugin]
    if (chartType !== 'bar') plugins.push(percentageLabelPlugin)

    const chart = new ChartJS(canvas, {
      type: chartType === 'bar' ? 'bar' : 'doughnut',
      data,
      options,
      plugins,
    })

    const link = document.createElement('a')
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    chart.destroy()
  }

  const renderChartToDataURL = (chartType, width, height) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const data = chartType === 'bar' ? barChartData : donutChartData
    const options = chartType === 'bar' ? exportBarOptions(true) : exportDonutOptions(true)
    const plugins = [whiteBackgroundPlugin]
    if (chartType !== 'bar') plugins.push(percentageLabelPlugin)

    const chart = new ChartJS(canvas, {
      type: chartType === 'bar' ? 'bar' : 'doughnut',
      data,
      options,
      plugins,
    })

    const dataURL = canvas.toDataURL('image/png')
    chart.destroy()
    return dataURL
  }

  /* ============ PDF HELPERS ============ */
  const pdfColors = {
    headerStart: [130, 100, 220],   /* #8264dc — purple */
    headerEnd: [99, 102, 241],      /* #6366f1 — indigo */
    accent: [167, 139, 250],        /* #a78bfa */
    green: [34, 197, 94],
    red: [239, 68, 68],
    darkText: [30, 41, 59],         /* #1e293b */
    mutedText: [100, 116, 139],     /* #64748b */
    lightBg: [248, 250, 252],       /* #f8fafc */
    divider: [226, 232, 240],       /* #e2e8f0 */
  }

  const drawRoundedRect = (doc, x, y, w, h, r, fill) => {
    doc.setFillColor(...fill)
    doc.roundedRect(x, y, w, h, r, r, 'F')
  }

  const drawSectionHeader = (doc, text, y) => {
    doc.setFillColor(...pdfColors.accent)
    doc.roundedRect(14, y - 4.5, 3, 7, 1, 1, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...pdfColors.darkText)
    doc.text(text, 20, y + 1)
    return y + 10
  }

  const addPageFooter = (doc) => {
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(...pdfColors.mutedText)
      doc.text(
        `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}  •  Personal Finance Dashboard`,
        14,
        287
      )
      doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' })
      /* thin divider above footer */
      doc.setDrawColor(...pdfColors.divider)
      doc.setLineWidth(0.3)
      doc.line(14, 283, 196, 283)
    }
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    /* ── Header band ── */
    doc.setFillColor(...pdfColors.headerStart)
    doc.rect(0, 0, pageWidth, 38, 'F')
    /* Subtle second band for gradient feel */
    doc.setFillColor(...pdfColors.headerEnd)
    doc.rect(pageWidth * 0.5, 0, pageWidth * 0.5, 38, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Personal Finance Report', 14, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const dateLine = `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    const tfLine = timeframe ? `  •  ${timeframe.earliest} to ${timeframe.latest}` : ''
    doc.text(dateLine + tfLine, 14, 28)

    doc.setFontSize(9)
    doc.text(`${transactions.length} transactions analysed`, 14, 34)

    /* ── Summary cards ── */
    let y = 50

    const cardW = 56
    const cardH = 26
    const cardGap = (pageWidth - 28 - cardW * 3) / 2
    const cards = [
      { label: 'Total Income', value: `£${totalIncome.toFixed(2)}`, color: pdfColors.green, bg: [240, 253, 244] },
      { label: 'Total Spending', value: `£${totalSpending.toFixed(2)}`, color: pdfColors.red, bg: [254, 242, 242] },
      { label: net >= 0 ? 'Net Savings' : 'Net Overspend', value: `£${Math.abs(net).toFixed(2)}`, color: net >= 0 ? pdfColors.green : pdfColors.red, bg: net >= 0 ? [240, 253, 244] : [254, 242, 242] },
    ]

    cards.forEach((card, i) => {
      const cx = 14 + i * (cardW + cardGap)
      drawRoundedRect(doc, cx, y, cardW, cardH, 3, card.bg)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...pdfColors.mutedText)
      doc.text(card.label, cx + cardW / 2, y + 9, { align: 'center' })
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...card.color)
      doc.text(card.value, cx + cardW / 2, y + 21, { align: 'center' })
    })

    y += cardH + 14

    /* ── Spending by Category ── */
    y = drawSectionHeader(doc, 'Spending by Category', y)

    const catBreakdown = {}
    spending.forEach((tx) => {
      catBreakdown[tx.category] = (catBreakdown[tx.category] || 0) + Math.abs(tx.amount)
    })

    const catRows = Object.entries(catBreakdown)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amount]) => {
        const pct = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : '0.0'
        return [cat, `£${amount.toFixed(2)}`, `${pct}%`]
      })

    doc.autoTable({
      startY: y,
      head: [['Category', 'Amount', '% of Total']],
      body: catRows,
      theme: 'grid',
      headStyles: {
        fillColor: [...pdfColors.accent],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [...pdfColors.darkText],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [...pdfColors.lightBg] },
      styles: { lineColor: [...pdfColors.divider], lineWidth: 0.3 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    })

    /* ── Top 10 Merchants ── */
    let currentY = doc.lastAutoTable.finalY + 12
    if (currentY > 235) {
      doc.addPage()
      currentY = 20
    }
    currentY = drawSectionHeader(doc, 'Top 10 Merchants', currentY)

    const merchantRows = topMerchants.map(([name, amount], i) => {
      const pct = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : '0.0'
      return [`${i + 1}`, name.substring(0, 40), `£${amount.toFixed(2)}`, `${pct}%`]
    })

    doc.autoTable({
      startY: currentY,
      head: [['#', 'Merchant', 'Amount', '% of Total']],
      body: merchantRows,
      theme: 'grid',
      headStyles: {
        fillColor: [...pdfColors.accent],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [...pdfColors.darkText],
        cellPadding: 3,
      },
      alternateRowStyles: { fillColor: [...pdfColors.lightBg] },
      styles: { lineColor: [...pdfColors.divider], lineWidth: 0.3 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    })

    /* ── Charts page ── */
    doc.addPage()

    /* Light header bar for charts page */
    doc.setFillColor(...pdfColors.lightBg)
    doc.rect(0, 0, pageWidth, 16, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...pdfColors.darkText)
    doc.text('Visual Breakdown', 14, 11)

    try {
      const barDataURL = renderChartToDataURL('bar', 700, 320)
      doc.addImage(barDataURL, 'PNG', 14, 22, 182, 83)

      const donutDataURL = renderChartToDataURL('doughnut', 700, 380)
      doc.addImage(donutDataURL, 'PNG', 14, 115, 182, 95)
    } catch (e) {
      doc.setFontSize(10)
      doc.setTextColor(...pdfColors.mutedText)
      doc.text('Charts could not be rendered.', 14, 30)
    }

    /* ── Footer on all pages ── */
    addPageFooter(doc)

    doc.save(`finance-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  /* ============ EMPTY STATE ============ */
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">💾</div>
        <h2>No data to export</h2>
        <p>Upload and categorise transactions first</p>
      </div>
    )
  }

  /* ============ RENDER ============ */
  return (
    <div className="section-stack">
      <div className="glass-panel glass-panel--static panel-body">
        <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Export Your Data</h2>
        <div className="export-grid">
          {/* CSV Export */}
          <div className="export-card">
            <div className="export-icon" aria-hidden="true">📄</div>
            <h3>CSV Export</h3>
            <p>Download cleaned & categorised transactions as a CSV file</p>
            <button onClick={downloadCSV} className="btn btn-export-csv w-full">
              Download CSV
            </button>
          </div>

          {/* Chart PNG */}
          <div className="export-card">
            <div className="export-icon" aria-hidden="true">📊</div>
            <h3>Chart Images</h3>
            <p>Download charts as PNG images</p>
            <div className="btn-stack">
              <button
                onClick={() => downloadChartPNG('bar', 'spending-over-time')}
                className="btn btn-export-bar w-full"
              >
                Bar Chart PNG
              </button>
              <button
                onClick={() => downloadChartPNG('doughnut', 'category-breakdown')}
                className="btn btn-export-donut w-full"
              >
                Donut Chart PNG
              </button>
            </div>
          </div>

          {/* PDF Report */}
          <div className="export-card">
            <div className="export-icon" aria-hidden="true">📑</div>
            <h3>PDF Report</h3>
            <p>Generate a detailed summary report</p>
            <button onClick={downloadPDF} className="btn btn-export-pdf w-full">
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        📊 <strong>{transactions.length}</strong> transactions ready to export •{' '}
        Income: <strong className="qs-income">£{totalIncome.toFixed(2)}</strong> •{' '}
        Spending: <strong className="qs-spending">£{totalSpending.toFixed(2)}</strong>
        {timeframe && (
          <span> • Period: <strong>{timeframe.earliest}</strong> to <strong>{timeframe.latest}</strong></span>
        )}
      </div>
    </div>
  )
}
