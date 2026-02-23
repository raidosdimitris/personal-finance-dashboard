import { useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { detectBank, mapTransaction } from '../utils/bankDetector'
import { cleanTransactions, normaliseDate, normaliseAmount } from '../utils/dataCleaner'
import { categoriseAll } from '../utils/categoriser'

let fileIdCounter = 0

/* ============ PRIVACY POPUP COMPONENT ============ */
function PrivacyPopup({ onAccept }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-popup-title"
    >
      <div
        className="glass-panel glass-panel--elevated"
        style={{
          maxWidth: '32rem',
          width: '100%',
          padding: '2rem',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} aria-hidden="true">🔒</div>
          <h2
            id="privacy-popup-title"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
            }}
          >
            Your Privacy Matters
          </h2>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          <p style={{ marginBottom: '0.75rem' }}>
            Before you upload, here&apos;s what you should know:
          </p>
          <ul style={{ paddingLeft: '1.25rem', listStyleType: 'disc', marginBottom: '1rem' }}>
            <li style={{ marginBottom: '0.375rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Your data is processed 100% locally</strong> — everything runs in your browser. No servers, no databases, no cloud.
            </li>
            <li style={{ marginBottom: '0.375rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Nothing is sent anywhere</strong> — a Content Security Policy blocks all outbound network requests from JavaScript.
            </li>
            <li style={{ marginBottom: '0.375rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Data disappears when you close the tab</strong> — your transaction data is held in browser memory only and is not saved to disk.
            </li>
            <li>
              <strong style={{ color: 'var(--text-primary)' }}>We recommend cleaning your files</strong> — remove sensitive columns (account numbers, balances) and keep only Date, Category, Merchant, and Amount.
            </li>
          </ul>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            You can verify this yourself by checking the Network tab in your browser&apos;s DevTools (F12), or by reviewing the{' '}
            <a
              href="https://github.com/raidosdimitris/personal-finance-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-primary)' }}
            >
              open-source code
            </a>.
          </p>
        </div>

        <button
          onClick={onAccept}
          className="btn btn-primary w-full"
          style={{ marginTop: '1.5rem' }}
          autoFocus
        >
          I Understand
        </button>
      </div>
    </div>
  )
}

export default function UploadClean({ transactions, setTransactions, setCategorisedTransactions }) {
  const [dragOver, setDragOver] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [validationInfo, setValidationInfo] = useState(null)
  const [issueFilter, setIssueFilter] = useState('all')
  const [uploadedFiles, setUploadedFiles] = useState([])

  /* ============ PRIVACY POPUP STATE ============ */
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false)

  useEffect(() => {
    const acknowledged = localStorage.getItem('finance-dashboard-privacy-acknowledged')
    if (!acknowledged) {
      setShowPrivacyPopup(true)
    }
  }, [])

  const handlePrivacyAccept = () => {
    localStorage.setItem('finance-dashboard-privacy-acknowledged', 'true')
    setShowPrivacyPopup(false)
  }

  /* ============ PROCESSING LOGIC (unchanged) ============ */
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

    const mapped = rows
      .filter((row) => Object.values(row).some((v) => v && v.toString().trim()))
      .map((row) => ({ ...mapTransaction(row, bank), sourceFile: fileEntry.name }))

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
      setTimeout(() => finishProcessing(updated), 0)
      return updated
    })
  }, [finishProcessing])

  const applyManualMapping = useCallback((fileId) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId)
      if (!file) return prev

      const { columnMapping, rawData, bankName } = file

      if (!columnMapping.date || !columnMapping.description || !columnMapping.amount || !columnMapping.category) {
        setError(`Please map all required columns (Date, Description, Amount, Category) for "${file.name}"`)
        return prev
      }

      if (!rawData || rawData.length === 0) {
        setError(`No data available for "${file.name}". Please re-upload.`)
        return prev
      }

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

        const resolvedCategory = row[columnMapping.category] || ''
        const resolvedBank = bankName && bankName.trim() ? bankName.trim() : 'Manual'

        return {
          date: dateVal,
          description: row[columnMapping.description] || '',
          amount: amountVal,
          originalCategory: resolvedCategory,
          reference: '',
          bank: resolvedBank,
          sourceFile: file.name,
        }
      })

      const mappingSummary = {
        Date: columnMapping.date,
        'Merchant/Description': columnMapping.description,
        Amount: columnMapping.amount,
        Category: columnMapping.category,
        Bank: bankName && bankName.trim() ? bankName.trim() : 'Manual',
      }

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
          ? { ...f, columnMapping: { ...f.columnMapping, [field]: value } }
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
    e.target.value = ''
  }

  const totalTransactions = uploadedFiles.reduce((sum, f) => sum + f.txCount, 0)
  const needsMapping = uploadedFiles.filter((f) => f.status === 'needs-mapping')

  const filteredTransactions = transactions.filter((tx) => {
    if (issueFilter === 'issues') return tx.issues?.length > 0
    if (issueFilter === 'no-issues') return !tx.issues || tx.issues.length === 0
    return true
  })

  /* ============ RENDER ============ */
  return (
    <div className="section-stack">
      {/* Privacy Popup */}
      {showPrivacyPopup && <PrivacyPopup onAccept={handlePrivacyAccept} />}

      {/* Upload Panel */}
      <div className="glass-panel glass-panel--static panel-body">
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>Upload Bank Statements</h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('file-input').click()}
          className={`drop-zone ${dragOver ? 'drop-zone--active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label="Upload bank statement files. Drag and drop or click to browse."
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('file-input').click() } }}
        >
          <div className="drop-icon" aria-hidden="true">📁</div>
          <p className="drop-title">Drag & drop your bank statements here</p>
          <p className="drop-subtitle">Supports CSV and Excel files from Monzo, Starling, Revolut, HSBC, Barclays, Nationwide</p>
          <p className="drop-hint">Upload multiple files at once — or add more files later</p>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            multiple
            onChange={onFileInput}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {error && (
          <div className="alert alert-error mt-4" role="alert">
            <span aria-hidden="true">⚠️</span> {error}
          </div>
        )}

        {validationInfo && (
          <div className="alert alert-warning mt-4" role="status">
            <span aria-hidden="true">🔧</span> {validationInfo}
          </div>
        )}
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="glass-panel glass-panel--static panel-body">
          <h3 className="section-title">
            Uploaded Files ({uploadedFiles.length})
            {totalTransactions > 0 && (
              <span className="section-subtitle ml-2">
                — {totalTransactions} total transactions
              </span>
            )}
          </h3>
          <div className="section-stack" style={{ gap: '0.75rem', marginTop: '1rem' }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`file-item ${
                  file.status === 'detected' || file.status === 'mapped'
                    ? 'file-item--success'
                    : file.status === 'needs-mapping'
                    ? 'file-item--warning'
                    : 'file-item--processing'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="file-icon" aria-hidden="true">
                    {file.status === 'detected' || file.status === 'mapped'
                      ? '✅'
                      : file.status === 'needs-mapping'
                      ? '⚙️'
                      : '⏳'}
                  </span>
                  <div className="min-w-0">
                    <p className="file-name">{file.name}</p>
                    <p className="file-meta">
                      {file.status === 'detected' && (
                        <>Auto-detected: <strong>{file.bank}</strong> — {file.txCount} transactions</>
                      )}
                      {file.status === 'mapped' && (
                        <>Bank: <strong>{file.bank}</strong> — {file.txCount} transactions</>
                      )}
                      {file.status === 'needs-mapping' && 'Manual mapping needed'}
                      {file.status === 'processing' && 'Processing...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="btn-danger-ghost"
                  title="Remove file"
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Mapping summaries */}
          {uploadedFiles.some((f) => f.mappingSummary && (f.status === 'detected' || f.status === 'mapped')) && (
            <div className="section-stack mt-4" style={{ gap: '0.5rem' }}>
              {uploadedFiles
                .filter((f) => f.mappingSummary && (f.status === 'detected' || f.status === 'mapped'))
                .map((file) => (
                  <div key={file.id} className="mapping-info">
                    <strong>{file.name} — Mapped columns:</strong>{' '}
                    {Object.entries(file.mappingSummary).map(([key, value]) => (
                      <span key={key} className="mapping-pair">
                        {key} → <strong>{value}</strong>
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Column Mapping */}
      {needsMapping.map((file) => (
        <div key={file.id} className="glass-panel glass-panel--static glass-panel--accent panel-body">
          <h3 className="section-title">
            Manual Column Mapping — <span style={{ color: 'var(--accent-gold)' }}>{file.name}</span>
          </h3>
          <p className="section-subtitle mb-4">
            We couldn&apos;t auto-detect the bank format. Please map the columns below.
          </p>

          <div className="mapping-grid">
            {['date', 'description', 'amount', 'category'].map((field) => (
              <div key={field}>
                <label className="glass-label" htmlFor={`mapping-${file.id}-${field}`}>
                  {field} *
                </label>
                <select
                  id={`mapping-${file.id}-${field}`}
                  value={file.columnMapping[field]}
                  onChange={(e) => updateFileMapping(file.id, field, e.target.value)}
                  className="glass-select"
                >
                  <option value="">Select column...</option>
                  {file.rawHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="grid-2-col mt-4">
            <div>
              <label className="glass-label" htmlFor={`bank-name-${file.id}`}>
                Bank Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id={`bank-name-${file.id}`}
                type="text"
                value={file.bankName}
                onChange={(e) => updateFileBankName(file.id, e.target.value)}
                placeholder='e.g. "Monzo", "Starling", "My Bank"'
                className="glass-input"
              />
            </div>
          </div>

          <button
            onClick={() => applyManualMapping(file.id)}
            className="btn btn-primary mt-4"
          >
            Apply Mapping
          </button>
        </div>
      ))}

      {/* Stats */}
      {stats && (
        <div className="kpi-grid">
          {[
            { label: 'Total Rows', value: stats.total, icon: '📄' },
            { label: 'Cleaned', value: stats.cleaned, icon: '✨' },
            { label: 'Duplicates Removed', value: stats.duplicatesRemoved, icon: '🔄' },
            { label: 'Issues Flagged', value: stats.withIssues, icon: '⚠️' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel glass-panel--accent kpi-card">
              <div className="kpi-icon" aria-hidden="true">{stat.icon}</div>
              <div className="kpi-value text-mono">{stat.value}</div>
              <div className="kpi-label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Data Preview Table */}
      {transactions.length > 0 && (
        <div className="glass-panel glass-panel--static" style={{ overflow: 'hidden' }}>
          <div className="panel-body" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="section-title">
                Cleaned Data Preview ({filteredTransactions.length} of {transactions.length} transactions)
              </h3>
              <div className="filter-pills">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'issues', label: '⚠️ Issues' },
                  { key: 'no-issues', label: '✓ No Issues' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setIssueFilter(f.key)}
                    className={`filter-pill ${issueFilter === f.key ? 'filter-pill--active' : ''}`}
                    aria-pressed={issueFilter === f.key}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="glass-table-wrap">
            <table className="glass-table">
              <thead>
                <tr>
                  {['Date', 'Description', 'Amount', 'Bank', 'Source File', 'Issues'].map((h) => (
                    <th key={h} scope="col">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 50).map((tx) => (
                  <tr key={tx.id} className={tx.issues?.length > 0 ? 'row-issue' : ''}>
                    <td>{tx.date}</td>
                    <td className="truncate-cell">{tx.description}</td>
                    <td style={{ fontWeight: 500 }}>
                      <span className={tx.amount >= 0 ? 'value-positive' : 'value-negative'}>
                        £{tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{tx.bank}</td>
                    <td className="truncate-cell" style={{ color: 'var(--text-muted)' }}>{tx.sourceFile}</td>
                    <td>
                      {tx.issues?.map((issue, i) => (
                        <span key={i} className="badge badge-warning" style={{ marginRight: '0.25rem' }}>
                          {issue}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length > 50 && (
            <div className="table-footer-info">
              Showing first 50 of {filteredTransactions.length} transactions
            </div>
          )}
        </div>
      )}
    </div>
  )
}
