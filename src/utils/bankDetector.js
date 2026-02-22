/**
 * Bank format detection and column mapping
 * Supports: Monzo, Starling, Revolut, HSBC, Barclays, Nationwide
 */

const BANK_FORMATS = {
  monzo: {
    name: 'Monzo',
    detect: (headers) => headers.includes('Transaction ID') && headers.includes('Name'),
    mapping: {
      date: 'Date',
      description: 'Name',
      amount: 'Amount',
      category: 'Category',
      notes: 'Notes and #tags',
    },
  },
  starling: {
    name: 'Starling',
    detect: (headers) => headers.includes('Counter Party') && headers.includes('Reference'),
    mapping: {
      date: 'Date',
      description: 'Counter Party',
      amount: 'Amount (GBP)',
      category: 'Spending Category',
      reference: 'Reference',
    },
  },
  revolut: {
    name: 'Revolut',
    detect: (headers) => headers.includes('Type') && headers.includes('Product') && headers.includes('Completed Date'),
    mapping: {
      date: 'Completed Date',
      description: 'Description',
      amount: 'Amount',
      currency: 'Currency',
      type: 'Type',
    },
  },
  hsbc: {
    name: 'HSBC',
    detect: (headers) => headers.includes('Transaction Date') && headers.includes('Transaction Description'),
    mapping: {
      date: 'Transaction Date',
      description: 'Transaction Description',
      amount: 'Transaction Amount',
    },
  },
  barclays: {
    name: 'Barclays',
    detect: (headers) => headers.includes('Memo') && headers.includes('Subcategory'),
    mapping: {
      date: 'Date',
      description: 'Memo',
      amount: 'Amount',
      subcategory: 'Subcategory',
    },
  },
  nationwide: {
    name: 'Nationwide',
    detect: (headers) =>
      headers.includes('Description') &&
      (headers.includes('Paid in') || headers.includes('Paid out')),
    mapping: {
      date: 'Date',
      description: 'Description',
      paidIn: 'Paid in',
      paidOut: 'Paid out',
    },
  },
}

/**
 * Detect bank format from CSV headers
 */
export function detectBank(headers) {
  const normalised = headers.map((h) => h.trim())
  for (const [id, format] of Object.entries(BANK_FORMATS)) {
    if (format.detect(normalised)) {
      return { id, ...format }
    }
  }
  return null
}

/**
 * Map raw row data to normalised transaction using bank mapping
 */
export function mapTransaction(row, bank) {
  const mapping = bank.mapping
  let amount

  // Handle Nationwide's split paid in/out columns
  if (bank.id === 'nationwide') {
    const paidIn = parseFloat((row[mapping.paidIn] || '0').replace(/[£,]/g, '')) || 0
    const paidOut = parseFloat((row[mapping.paidOut] || '0').replace(/[£,]/g, '')) || 0
    amount = paidIn > 0 ? paidIn : -paidOut
  } else {
    amount = parseFloat((row[mapping.amount] || '0').replace(/[£,]/g, '')) || 0
  }

  return {
    date: row[mapping.date] || '',
    description: row[mapping.description] || '',
    amount,
    originalCategory: row[mapping.category] || row[mapping.subcategory] || '',
    reference: row[mapping.reference] || row[mapping.notes] || '',
    bank: bank.name,
  }
}

export { BANK_FORMATS }
