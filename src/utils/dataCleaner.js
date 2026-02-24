/**
 * Data cleaning utilities
 * - Normalise dates and amounts
 * - Strip sensitive fields (account numbers, sort codes)
 * - Deduplicate transactions
 * - Flag potential issues
 */

/**
 * Normalise a date string to YYYY-MM-DD format
 * Handles: Excel serial dates, DD/MM/YYYY, M/D/YY, YYYY-MM-DD, native Date parsing
 */
export function normaliseDate(dateStr) {
  if (!dateStr && dateStr !== 0) return ''

  // Excel serial date: days since 1900-01-01 (with the 1900 leap year bug)
  if (typeof dateStr === 'number' || (typeof dateStr === 'string' && /^\d{4,5}(\.\d+)?$/.test(dateStr.trim()))) {
    const serial = typeof dateStr === 'number' ? dateStr : parseFloat(dateStr.trim())
    if (serial > 1 && serial < 200000) {
      const utcDays = serial - 25569 // Excel epoch offset to Unix epoch
      const date = new Date(utcDays * 86400 * 1000)
      return date.toISOString().split('T')[0]
    }
  }

  const str = String(dateStr).trim()

  // DD/MM/YYYY (UK) or M/D/YYYY (US) — detect by checking if first number > 12
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    let [, a, b, year] = slashMatch
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year
    }
    let day, month
    if (parseInt(a) > 12) {
      day = a; month = b  // UK: DD/MM/YYYY
    } else if (parseInt(b) > 12) {
      month = a; day = b  // US: MM/DD/YYYY
    } else {
      day = a; month = b  // Ambiguous — assume UK
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // DD-MM-YYYY
  const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, day, month, year] = dashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return isoMatch[0]

  // Try native Date parsing as fallback
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }

  return str // Return as-is if we can't parse
}

/**
 * Strip sensitive information from descriptions
 */
export function stripSensitiveData(text) {
  if (!text) return ''
  return text
    // Remove sort codes (XX-XX-XX)
    .replace(/\b\d{2}-\d{2}-\d{2}\b/g, '***')
    // Remove account numbers (8 digit sequences)
    .replace(/\b\d{8}\b/g, '****')
    // Remove card numbers (last 4 often shown)
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '****')
    .trim()
}

/**
 * Normalise amount to a number
 */
export function normaliseAmount(amount) {
  if (typeof amount === 'number') return amount
  if (!amount) return 0
  const cleaned = String(amount).replace(/[£$€,\s]/g, '')
  return parseFloat(cleaned) || 0
}

/**
 * Deduplicate transactions based on date, description, and amount
 */
export function deduplicateTransactions(transactions) {
  const seen = new Set()
  const deduplicated = []
  const duplicates = []

  for (const tx of transactions) {
    const key = `${tx.date}|${tx.description}|${tx.amount}`
    if (seen.has(key)) {
      duplicates.push(tx)
    } else {
      seen.add(key)
      deduplicated.push(tx)
    }
  }

  return { deduplicated, duplicates }
}

/**
 * Flag potential issues in transactions
 */
export function flagIssues(transactions) {
  return transactions.map((tx) => {
    const issues = []
    if (!tx.date) issues.push('Missing date')
    if (!tx.description) issues.push('Missing description')
    if (tx.amount === 0) issues.push('Zero amount')
    if (Math.abs(tx.amount) > 10000) issues.push('Unusually large amount')
    if (tx.date && isNaN(new Date(tx.date).getTime())) issues.push('Invalid date')
    return { ...tx, issues }
  })
}

/**
 * Full cleaning pipeline
 */
export function cleanTransactions(rawTransactions) {
  // Normalise dates and amounts, strip sensitive data
  let cleaned = rawTransactions.map((tx, index) => ({
    id: `tx-${index}-${Date.now()}`,
    date: normaliseDate(tx.date),
    description: stripSensitiveData(tx.description),
    amount: normaliseAmount(tx.amount),
    originalCategory: tx.originalCategory || '',
    reference: stripSensitiveData(tx.reference || ''),
    bank: tx.bank || 'Unknown',
    sourceFile: tx.sourceFile || '',
    category: '',
  }))

  // Deduplicate
  const { deduplicated, duplicates } = deduplicateTransactions(cleaned)

  // Flag issues
  const flagged = flagIssues(deduplicated)

  return {
    transactions: flagged,
    stats: {
      total: rawTransactions.length,
      cleaned: flagged.length,
      duplicatesRemoved: duplicates.length,
      withIssues: flagged.filter((tx) => tx.issues.length > 0).length,
    },
  }
}
