/**
 * Data cleaning utilities
 * - Normalise dates and amounts
 * - Strip sensitive fields (account numbers, sort codes)
 * - Deduplicate transactions
 * - Flag potential issues
 */

/**
 * Normalise a date string to YYYY-MM-DD format
 */
export function normaliseDate(dateStr) {
  if (!dateStr) return ''
  const str = dateStr.trim()

  // Try common formats
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD (already normalised)
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // DD Mon YYYY
    /^(\d{1,2})\s+(\w{3})\s+(\d{4})$/,
  ]

  // DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
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
