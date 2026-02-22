import { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { detectBank, mapTransaction } from '../utils/bankDetector'
import { cleanTransactions, normaliseDate, normaliseAmount } from '../utils/dataCleaner'
import { categoriseAll } from '../utils/categoriser'

export default function UploadClean({ transactions, setTransactions, setCategorisedTransactions }) {
  const [dragOver, setDragOver] = useState(false)
  const [stats, setStats] = useState(null)
  const [detectedBank, setDetectedBank] = useState(null)
  const [error, setError] = useState(null)
  const [showMapping, setShowMapping] = useState(false)
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawData, setRawData] = useState([])
  const [columnMapping, setColumnMapping] = useState({ date: '', description: '', amount: '' })
  const [manualMappingSuccess, setManualMappingSuccess] = useState(null)
  const [mappingInfo, setMappingInfo] = useState(null)
  const [validationInfo, setValidationInfo] = useState(null)

  const finishProcessing = (mapped, mappingSummary, manualSuccessMsg, validationMsg) => {
    const { transactions: cleaned, stats: cleanStats } = cleanTransactions(mapped)
    setStats(cleanStats)
    setTransactions(cleaned)
    const categorised = categoriseAll(cleaned)
    setCategorisedTransactions(categorised)
    setShowMapping(false)
    setError(null)
    if (mappingSummary) {
      setMappingInfo(mappingSummary)
    }
    if (manualSuccessMsg) {
      setManualMappingSuccess(manualSuccessMsg)
    }
    if (validationMsg) {
      setValidationInfo(validationMsg)
    }
  }

  const processData = (headers, rows) => {
    const bank = detectBank(headers)
    setDetectedBank(bank)
    setManualMappingSuccess(null)
    setMappingInfo(null)
    setValidationInfo(null)

    if (!bank) {
      setRawHeaders(headers)
      setRawData(rows)
      setShowMapping(true)
      return
    }

    const mapped = rows
      .filter((row) => Object.values(row).some((v) => v && v.toString().trim()))
      .map((row) => mapTransaction(row, bank))

    const mappingSummary = {
      Date: bank.mapping.date,
      'Merchant/Description': bank.mapping.description,
      Amount: bank.mapping.amount || (bank.id === 'nationwide' ? `${bank.mapping.paidIn} / ${bank.mapping.paidOut}` : '—'),
      Category: bank.mapping.category || bank.mapping.subcategory || '—',
    }

    finishProcessing(mapped, mappingSummary)
  }

  const applyManualMapping = () => {
    if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
      setError('Please map all required columns (Date, Description, Amount)')
      return
    }

    if (rawData.length === 0) {
      setError('No data available. Please re-upload your file.')
      return
    }

    // Validate and convert mapped data
    let dateConversions = 0
    let amountConversions = 0
    let dateErrors = 0

    const mapped = rawData.map((row) => {
      let dateVal = row[columnMapping.date] || ''
      let amountVal = row[columnMapping.amount] || '0'

      // Check if date is an Excel serial number and convert
      const normDate = normaliseDate(dateVal)
      if (normDate !== String(dateVal).trim() && normDate !== '') {
        dateConversions++
      }
      if (normDate === String(dateVal).trim() && dateVal && isNaN(new Date(dateVal).getTime())) {
        dateErrors++
      }

      // Check if amount needs cleaning (currency symbols, etc.)
      const normAmount = normaliseAmount(amountVal)
      if (typeof amountVal === 'string' && amountVal.replace(/[£$€,\s]/g, '') !== amountVal) {
        amountConversions++
      }

      return {
        date: dateVal,
        description: row[columnMapping.description] || '',
        amount: amountVal,
        originalCategory: '',
        reference: '',
        bank: 'Manual',
      }
    })

    const mappingSummary = {
      Date: columnMapping.date,
      'Merchant/Description': columnMapping.description,
      Amount: columnMapping.amount,
      Category: '—',
    }

    // Build validation feedback
    const validationParts = []
    if (dateConversions > 0) {
      validationParts.push(`${dateConversions} date(s) converted from serial/alternate format`)
    }
    if (amountConversions > 0) {
      validationParts.push(`${amountConversions} amount(s) had currency symbols stripped`)
    }
    if (dateErrors > 0) {
      validationParts.push(`⚠️ ${dateErrors} date(s) could not be parsed`)
    }
    const validationMsg = validationParts.length > 0 ? validationParts.join(' • ') : null

    const successMsg = `✅ Manual mapping applied successfully — ${mapped.length} transactions loaded`
    finishProcessing(mapped, mappingSummary, successMsg, validationMsg)
    setDetectedBank(null)
  }

  const handleFile = (file) => {
    setError(null)
    setManualMappingSuccess(null)
    setMappingInfo(null)
    setValidationInfo(null)
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing errors: ${results.errors.map((e) => e.message).join(', ')}`)
          }
          processData(results.meta.fields || [], results.data)
        },
        error: (err) => setError(`Failed to parse CSV: ${err.message}`),
      })
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          // Use raw: false to get formatted values (dates as strings, not serial numbers)
          const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
          const headers = data.length > 0 ? Object.keys(data[0]) : []
          processData(headers, data)
        } catch (err) {
          setError(`Failed to parse Excel file: ${err.message}`)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setError('Unsupported file format. Please upload a CSV or Excel file.')
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onFileInput = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Bank Statement</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="text-4xl mb-3">📁</div>
          <p className="text-lg font-medium text-gray-700">
            Drag & drop your bank statement here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supports CSV and Excel files from Monzo, Starling, Revolut, HSBC, Barclays, Nationwide
          </p>
          <p className="text-xs text-gray-400 mt-2">or click to browse</p>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFileInput}
            className="hidden"
          />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {detectedBank && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✅ Detected format: <strong>{detectedBank.name}</strong>
          </div>
        )}

        {manualMappingSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {manualMappingSuccess}
          </div>
        )}

        {validationInfo && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            🔧 {validationInfo}
          </div>
        )}

        {mappingInfo && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <strong>Mapped columns:</strong>{' '}
            {Object.entries(mappingInfo).map(([key, value]) => (
              <span key={key} className="inline-block mr-3">
                {key} → <strong>{value}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Manual Column Mapping */}
      {showMapping && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3">Manual Column Mapping</h3>
          <p className="text-sm text-gray-500 mb-4">
            We couldn&apos;t auto-detect your bank format. Please map the columns below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['date', 'description', 'amount'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                  {field} *
                </label>
                <select
                  value={columnMapping[field]}
                  onChange={(e) => setColumnMapping((m) => ({ ...m, [field]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select column...</option>
                  {rawHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            onClick={applyManualMapping}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Apply Mapping
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Rows', value: stats.total, icon: '📄' },
            { label: 'Cleaned', value: stats.cleaned, icon: '✨' },
            { label: 'Duplicates Removed', value: stats.duplicatesRemoved, icon: '🔄' },
            { label: 'Issues Flagged', value: stats.withIssues, icon: '⚠️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-2xl">{stat.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Data Preview Table */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              Cleaned Data Preview ({transactions.length} transactions)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Description', 'Amount', 'Bank', 'Issues'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.slice(0, 50).map((tx) => (
                  <tr key={tx.id} className={tx.issues?.length > 0 ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{tx.description}</td>
                    <td className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      £{tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.bank}</td>
                    <td className="px-4 py-3 text-sm">
                      {tx.issues?.map((issue, i) => (
                        <span key={i} className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded mr-1">
                          {issue}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transactions.length > 50 && (
            <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
              Showing first 50 of {transactions.length} transactions
            </div>
          )}
        </div>
      )}
    </div>
  )
}
