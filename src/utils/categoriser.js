/**
 * Transaction categorisation engine
 * Uses keyword-based rules with localStorage persistence
 */

import defaultRules from '../data/categoryRules.json'

const STORAGE_KEY = 'finance-dashboard-category-rules'
const CUSTOM_CATEGORIES_KEY = 'finance-dashboard-custom-categories'

/**
 * Mapping of common bank-provided categories to internal categories
 */
const BANK_CATEGORY_MAP = {
  // Monzo categories
  'eating out': 'dining',
  'groceries': 'groceries',
  'transport': 'transport',
  'shopping': 'shopping',
  'entertainment': 'entertainment',
  'bills': 'utilities',
  'personal care': 'health',
  'general': 'other',
  'finances': 'transfers',
  'charity': 'other',
  'family': 'other',
  'holidays': 'entertainment',
  'expenses': 'other',
  // Starling categories
  'food & drink': 'dining',
  'home': 'utilities',
  'lifestyle': 'entertainment',
  'payments': 'transfers',
  'saving': 'transfers',
  'income': 'income',
  // Barclays subcategories
  'food and drink': 'dining',
  'transportation': 'transport',
  'health and beauty': 'health',
  'utilities and bills': 'utilities',
}

/**
 * Load category rules from localStorage or use defaults
 */
export function loadRules() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : { ...defaultRules }
  } catch {
    return { ...defaultRules }
  }
}

/**
 * Save category rules to localStorage
 */
export function saveRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

/**
 * Load custom categories
 */
export function loadCustomCategories() {
  try {
    const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save custom categories
 */
export function saveCustomCategories(categories) {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories))
}

/**
 * Get all available categories (built-in + custom)
 */
export function getAllCategories() {
  const rules = loadRules()
  const custom = loadCustomCategories()
  const builtIn = Object.keys(rules)
  return [...new Set([...builtIn, ...custom])]
}

/**
 * Map a bank-provided category to an internal category.
 * Returns mapped category or the original (lowercased) if no mapping exists.
 * Returns null if the input is empty.
 */
function mapBankCategory(bankCategory) {
  if (!bankCategory) return null
  const normalised = bankCategory.trim().toLowerCase()
  if (!normalised) return null
  return BANK_CATEGORY_MAP[normalised] || normalised
}

/**
 * Categorise a single transaction based on description keywords
 */
export function categoriseTransaction(description, rules) {
  const desc = (description || '').toLowerCase()
  for (const [category, keywords] of Object.entries(rules)) {
    if (category === 'other') continue
    for (const keyword of keywords) {
      if (desc.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }
  return 'other'
}

/**
 * Categorise all transactions.
 * Priority: existing category > bank's original category > keyword-based
 */
export function categoriseAll(transactions) {
  const rules = loadRules()
  return transactions.map((tx) => {
    // If already categorised, keep it
    if (tx.category) return tx
    // Try bank's original category first
    const bankCat = mapBankCategory(tx.originalCategory)
    if (bankCat) {
      return { ...tx, category: bankCat }
    }
    // Fall back to keyword-based categorisation
    return { ...tx, category: categoriseTransaction(tx.description, rules) }
  })
}

/** Category colours for charts */
export const CATEGORY_COLOURS = {
  groceries: '#34d399',
  transport: '#818cf8',
  dining: '#c084fc',
  subscriptions: '#a78bfa',
  utilities: '#94a3b8',
  entertainment: '#f0abfc',
  shopping: '#67e8f9',
  health: '#fca5a5',
  income: '#6ee7b7',
  transfers: '#cbd5e1',
  other: '#94a3b8',
}

export function getCategoryColour(category) {
  return CATEGORY_COLOURS[category] || '#94a3b8'
}
