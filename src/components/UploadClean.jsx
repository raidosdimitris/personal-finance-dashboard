import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { detectBank, mapTransaction } from '../utils/bankDetector'
import { cleanTransactions, normaliseDate, normaliseAmount } from '../utils/dataCleaner'
import { categoriseAll } from '../utils/categoriser'

let fileIdCounter = 0

export default function UploadClean({ transactions, setTransactions, setCategorisedTransactions }) {
  const [dragOver, setDragOver] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [validationInfo, setValidationInfo] = useState(null)

  // Multi-file state: each entry tracks one uploaded file
  // { id, name, status: 'detected'|'needs-mapping'|'mapped', bank, rawHeaders, rawData,
  //   columnMapping, bankName, transactions (raw mapped), txCount }
  const [uploadedFiles, setUploadedFiles] = useState([])

  // Recompute combined transactions from all mapped files
  const finishProcessing = useCallback((files) => {
    const allMapped = files
      .filter((f) => f.status === 'detected' || f.status === 'mapped')
      .flatMap((f) => f.transactions)

    if (allMapped.length === 0) {
      setTransactions([])
      setCategorisedTransactions([])
      setStats(null)
      return
    }

    const { transactions: cleaned, stats: cleanStats } = cleanTransactions(allMapped)
    setStats(cleanStats)
    setTransactions(cleaned)
    const categorised = categoriseAll(cleaned)
    setCategorisedTransactions(categorised)
    setError(null)
  }, [setTransactions, setCategorisedTransactions])

  const processFileData = useCallback((fileEntry, headers, rows) => {
    const bank = detectBank(headers)

    if (!bank) {
      // Needs manual mapping
      setUploadedFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === fileEntry.id
            ? {
                ...f,
                status: 'needs-mapping',
                bank: null,
                rawHeaders: headers,
                rawData: rows,
                columnMapping: { date: '', description: '', amount: '', category: '' },
                bankName: '',
              }
            : f
        )
        return updated
      })
      return
    }

    // Auto-detected
    const mapped = rows
      .filter((row) => Object.values(row).some((v) => v && v.toString().trim()))
      .map((row) => mapTransaction(row, bank))

    setUploadedFiles((prev) => {
      const updated = prev.map((f) =>
        f.id === fileEntry.id
          ? {
              ...f,
              status: 'detected',
              bank: bank.name,
              bankId: bank.id,
              transactions: mapped,
              txCount: mapped.length,
              mappingSummary: {
                Date: bank.mapping.date,
                'Merchant/Description': bank.mapping.description,
                Amount:
                  bank.mapping.amount ||
                  (bank.id === 'nationwide'
                    ? `${bank.mapping.paidIn} / ${bank.mapping.paidOut}`
                    : '—'),
                Category: bank.mapping.category || bank.mapping.subcategory || '—',
              },
            }
          : f
      )
      // Auto-process: recompute combined transactions
      setTimeout(() => finishProcessing(updated), 0)
      return updated
    })
  }, [finishProcessing])

  const applyManualMapping = useCallback((fileId) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId)
      if (!file) return prev

      const { columnMapping, rawData, bankName } = file

      if (!columnMapping.date || !columnMapping.description || !columnMapping.amount) {
        setError(`Please map all required columns (Date, Description, Amount) for "${file.name}"`)
        return prev
      }

      if (!rawData || rawData.length === 0) {
        setError(`No data available for "${file.name}". Please re-upload.`)
        return prev
      }

      // Validate and convert mapped data
      let dateConversions = 0
      let amountConversions = 0
      let dateErrors = 0

      const mapped = rawData.map((row) => {
        let dateVal = row[columnMapping.date] || ''
        let amountVal = row[columnMapping.amount] || '0'

        const normDate = normaliseDate(dateVal)
        if (normDate !== String(dateVal).trim() && normDate !== '') {
          dateConversions++
        }
        if (normDate === String(dateVal).trim() && dateVal && isNaN(new Date(dateVal).getTime())) {
          dateErrors++
        }

        const rawAmountStr = typeof amountVal === 'string' ? amountVal : ''
        if (rawAmountStr.replace(/[£$€,\s]/g, '') !== rawAmountStr) {
          amountConversions++
        }

        const resolvedCategory = columnMapping.category ? row[columnMapping.category] || '' : ''
        const resolvedBank = bankName && bankName.trim() ? bankName.trim() : 'Manual'

        return {
          date: dateVal,
          description: row[columnMapping.description] || '',
          amount: amountVal,
          originalCategory: resolvedCategory,
          reference: '',
          bank: resolvedBank,
        }
      })

      const mappingSummary = {
        Date: columnMapping.date,
        'Merchant/Description': columnMapping.description,
        Amount: columnMapping.amount,
        Category: columnMapping.category || '—',
        Bank: bankName && bankName.trim() ? bankName.trim() : 'Manual',
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
      if (validationParts.length > 0) {
        setValidationInfo(validationParts.join(' • '))
      }

      const updated = prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: 'mapped',
              bank: bankName && bankName.trim() ? bankName.trim() : 'Manual',
              transactions: mapped,
              txCount: mapped.length,
              mappingSummary,
            }
          : f
      )

      setError(null)
      setTimeout(() => finishProcessing(updated), 0)
      return updated
    })
  }, [finishProcessing])

  const handleFile = useCallback((file) => {
    const id = `file-${++fileIdCounter}`
    const entry = {
      id,
      name: file.name,
      status: 'processing',
      bank: null,
      rawHeaders: [],
      rawData: [],
      columnMapping: { date: '', description: '', amount: '', category: '' },
      bankName: '',
      transactions: [],
      txCount: 0,
      mappingSummary: null,
    }

    setUploadedFiles((prev) => [...prev, entry])
    setError(null)

    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing errors in "${file.name}": ${results.errors.map((e) => e.message).join(', ')}`)
          }
          processFileData(entry, results.meta.fields || [], results.data)
        },
        error: (err) => {
          setError(`Failed to parse CSV "${file.name}": ${err.message}`)
          setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
        },
      })
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const sheet = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
          const headers = data.length > 0 ? Object.keys(data[0]) : []
          processFileData(entry, headers, data)
        } catch (err) {
          setError(`Failed to parse Excel file "${file.name}": ${err.message}`)
          setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      setError('Unsupported file format. Please upload a CSV or Excel file.')
      setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
    }
  }, [processFileData])

  const handleMultipleFiles = useCallback((fileList) => {
    for (let i = 0; i < fileList.length; i++) {
      handleFile(fileList[i])
    }
  }, [handleFile])

  const removeFile = useCallback((fileId) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId)
      setTimeout(() => finishProcessing(updated), 0)
      return updated
    })
  }, [finishProcessing])

  const updateFileMapping = useCallback((fileId, field, value) => {
    setUploadedFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              columnMapping: { ...f.columnMapping, [field]: value },
            }
          : f
      )
    )
  }, [])

  const updateFileBankName = useCallback((fileId, value) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, bankName: value } : f))
    )
  }, [])

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files)
    }
  }

  const onFileInput = (e) => {
    if (e.target.files.length > 0) {
      handleMultipleFiles(e.target.files)
    }
    // Reset so the same file(s) can be re-uploaded
    e.target.value = ''
  }

  const totalTransactions = uploadedFiles.reduce((sum, f) => sum + f.txCount, 0)
  const needsMapping = uploadedFiles.filter((f) => f.status === 'needs-mapping')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Upload Bank Statements</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="text-4xl mb-3">📁</div>
          <p className="text-lg font-medium text-gray-700">
            Drag & drop your bank statements here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supports CSV and Excel files from Monzo, Starling, Revolut, HSBC, Barclays, Nationwide
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Upload multiple files at once — or add more files later
          </p>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={onFileInput}
            className="hidden"
          />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {validationInfo && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            🔧 {validationInfo}
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-3">
            Uploaded Files ({uploadedFiles.length})
            {totalTransactions > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                — {totalTransactions} total transactions
              </span>
            )}
          </h3>
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  file.status === 'detected' || file.status === 'mapped'
                    ? 'bg-green-50 border-green-200'
                    : file.status === 'needs-mapping'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">
                    {file.status === 'detected' || file.status === 'mapped'
                      ? '✅'
                      : file.status === 'needs-mapping'
                      ? '⚙️'
                      : '⏳'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {file.status === 'detected' && (
                        <>
                          Auto-detected: <strong>{file.bank}</strong> — {file.txCount} transactions
                        </>
                      )}
                      {file.status === 'mapped' && (
                        <>
                          Bank: <strong>{file.bank}</strong> — {file.txCount} transactions
                        </>
                      )}
                      {file.status === 'needs-mapping' && 'Manual mapping needed'}
                      {file.status === 'processing' && 'Processing...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-red-400 hover:text-red-600 text-sm font-medium flex-shrink-0 ml-3"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Show mapping summaries for detected/mapped files */}
          {uploadedFiles.some((f) => f.mappingSummary && (f.status === 'detected' || f.status === 'mapped')) && (
            <div className="mt-4 space-y-2">
              {uploadedFiles
                .filter((f) => f.mappingSummary && (f.status === 'detected' || f.status === 'mapped'))
                .map((file) => (
                  <div key={file.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                    <strong>{file.name} — Mapped columns:</strong>{' '}
                    {Object.entries(file.mappingSummary).map(([key, value]) => (
                      <span key={key} className="inline-block mr-3">
                        {key} → <strong>{value}</strong>
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Column Mapping — one per file that needs it */}
      {needsMapping.map((file) => (
        <div key={file.id} className="bg-white rounded-lg shadow-sm border border-amber-200 p-6">
          <h3 className="text-lg font-semibold mb-1">
            Manual Column Mapping — <span className="text-amber-600">{file.name}</span>
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            We couldn&apos;t auto-detect the bank format. Please map the columns below.
          </p>

          {/* Required mappings: Date, Description, Amount */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['date', 'description', 'amount'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                  {field} *
                </label>
                <select
                  value={file.columnMapping[field]}
                  onChange={(e) => updateFileMapping(file.id, field, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select column...</option>
                  {file.rawHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Optional: Category mapping + Bank name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={file.columnMapping.category}
                onChange={(e) => updateFileMapping(file.id, 'category', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">No category column</option>
                {file.rawHeaders.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={file.bankName}
                onChange={(e) => updateFileBankName(file.id, e.target.value)}
                placeholder='e.g. "Monzo", "Starling", "My Bank"'
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={() => applyManualMapping(file.id)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Apply Mapping
          </button>
        </div>
      ))}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Rows', value: stats.total, icon: '📄' },
            { label: 'Cleaned', value: stats.cleaned, icon: '✨' },
            { label: 'Duplicates Removed', value: stats.duplicatesRemoved, icon: '🔄' },
            { label: 'Issues Flagged', value: stats.withIssues, icon: '⚠️' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
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
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
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
                    <td
                      className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      £{tx.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.bank}</td>
                    <td className="px-4 py-3 text-sm">
                      {tx.issues?.map((issue, i) => (
                        <span
                          key={i}
                          className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded mr-1"
                        >
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
