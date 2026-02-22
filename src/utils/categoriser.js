/**
 * Transaction categorisation engine
 * Uses keyword-based rules with localStorage persistence
 */

import defaultRules from '../data/categoryRules.json'

const STORAGE_KEY = 'finance-dashboard-category-rules'
const CUSTOM_CATEGORIES_KEY = 'finance-dashboard-custom-categories'

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
 * Categorise all transactions
 */
export function categoriseAll(transactions) {
  const rules = loadRules()
  return transactions.map((tx) => ({
    ...tx,
    category: tx.category || categoriseTransaction(tx.description, rules),
  }))
}

/** Category colours for charts */
export const CATEGORY_COLOURS = {
  groceries: '#22c55e',
  transport: '#3b82f6',
  dining: '#f97316',
  subscriptions: '#8b5cf6',
  utilities: '#64748b',
  entertainment: '#ec4899',
  shopping: '#eab308',
  health: '#ef4444',
  income: '#10b981',
  transfers: '#6b7280',
  other: '#94a3b8',
}

export function getCategoryColour(category) {
  return CATEGORY_COLOURS[category] || '#94a3b8'
}
