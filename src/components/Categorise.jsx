import { useState, useEffect, useMemo } from 'react'
import {
  loadRules,
  saveRules,
  categoriseAll,
  getAllCategories,
  loadCustomCategories,
  saveCustomCategories,
  getCategoryColour,
} from '../utils/categoriser'

/* ============================================================
   InfoTooltip — Glassmorphism elevated tooltip
   ============================================================ */
function InfoTooltip({ text }) {
  return (
    <span className="info-tooltip-wrap">
      <span className="info-tooltip-trigger" aria-label="More information">?</span>
      <span className="info-tooltip-content" role="tooltip">{text}</span>
    </span>
  )
}

export default function Categorise({ transactions, categorisedTransactions, setCategorisedTransactions }) {
  const [rules, setRules] = useState(loadRules())
  const [categories, setCategories] = useState(getAllCategories())
  const [newCategory, setNewCategory] = useState('')
  const [editingRule, setEditingRule] = useState(null)
  const [newKeyword, setNewKeyword] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  /* ============ ALL JS LOGIC PRESERVED EXACTLY ============ */
  useEffect(() => {
    if (transactions.length > 0 && categorisedTransactions.length === 0) {
      setCategorisedTransactions(categoriseAll(transactions))
    }
  }, [transactions])

  const handleCategoryChange = (txId, newCat) => {
    setCategorisedTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, category: newCat } : tx))
    )
  }

  const addCustomCategory = () => {
    const name = newCategory.trim().toLowerCase()
    if (!name || categories.includes(name)) return
    const updated = [...categories, name]
    setCategories(updated)
    const customCats = loadCustomCategories()
    saveCustomCategories([...customCats, name])
    const newRules = { ...rules, [name]: [] }
    setRules(newRules)
    saveRules(newRules)
    setNewCategory('')
  }

  const addKeyword = (category) => {
    if (!newKeyword.trim()) return
    const updatedRules = {
      ...rules,
      [category]: [...(rules[category] || []), newKeyword.trim().toLowerCase()],
    }
    setRules(updatedRules)
    saveRules(updatedRules)
    setNewKeyword('')
    setCategorisedTransactions(categoriseAll(transactions))
  }

  const removeKeyword = (category, keyword) => {
    const updatedRules = {
      ...rules,
      [category]: rules[category].filter((k) => k !== keyword),
    }
    setRules(updatedRules)
    saveRules(updatedRules)
  }

  const recategoriseAll = () => {
    const reset = transactions.map((tx) => ({ ...tx, category: '' }))
    setCategorisedTransactions(categoriseAll(reset))
  }

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return categorisedTransactions
    const q = searchQuery.toLowerCase()
    return categorisedTransactions.filter((tx) =>
      (tx.description || '').toLowerCase().includes(q) ||
      (tx.category || '').toLowerCase().includes(q)
    )
  }, [categorisedTransactions, searchQuery])

  /* ============ EMPTY STATE ============ */
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" aria-hidden="true">🏷️</div>
        <h2>No transactions to categorise</h2>
        <p>Upload a bank statement first</p>
      </div>
    )
  }

  const categoryCounts = categorisedTransactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + 1
    return acc
  }, {})

  /* ============ RENDER ============ */
  return (
    <div className="section-stack">
      {/* Category Summary */}
      <div className="glass-panel glass-panel--static panel-body">
        <div className="section-header">
          <h2 className="section-title">
            Category Summary
            <InfoTooltip text="Categories are automatically assigned based on keyword rules. You can add custom categories and then change individual transactions to use them." />
          </h2>
          <button onClick={recategoriseAll} className="btn btn-primary">
            🔄 Re-categorise All
          </button>
        </div>
        <div className="category-wrap">
          {categories.map((cat) => (
            <span
              key={cat}
              className="badge-category"
              style={{ backgroundColor: getCategoryColour(cat) }}
            >
              {cat} ({categoryCounts[cat] || 0})
            </span>
          ))}
        </div>
      </div>

      {/* Add Custom Category */}
      <div className="glass-panel glass-panel--static panel-body">
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Custom Categories</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name..."
            className="glass-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
            aria-label="New category name"
          />
          <button onClick={addCustomCategory} className="btn btn-success">
            + Add
          </button>
        </div>
      </div>

      {/* Category Rules Editor */}
      <div className="glass-panel glass-panel--static panel-body">
        <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>
          Category Rules (Keywords)
          <InfoTooltip text="Keywords are used to automatically categorise transactions. Default keywords match common merchant names. Click a category to see its keywords, and add your own to improve categorisation accuracy." />
        </h3>
        <div className="section-stack" style={{ gap: '0.5rem' }}>
          {categories.filter((c) => c !== 'other').map((cat) => (
            <div key={cat} className="rule-accordion">
              <div
                className="rule-accordion-header"
                onClick={() => setEditingRule(editingRule === cat ? null : cat)}
                role="button"
                tabIndex={0}
                aria-expanded={editingRule === cat}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingRule(editingRule === cat ? null : cat) } }}
              >
                <span className="cat-name">
                  <span
                    className="rank-dot"
                    style={{ backgroundColor: getCategoryColour(cat) }}
                    aria-hidden="true"
                  />
                  {cat}
                </span>
                <span className="cat-count">
                  {(rules[cat] || []).length} keywords {editingRule === cat ? '▲' : '▼'}
                </span>
              </div>
              {editingRule === cat && (
                <div className="rule-accordion-body">
                  <div className="keyword-list">
                    {(rules[cat] || []).map((kw) => (
                      <span key={kw} className="keyword-tag">
                        {kw}
                        <button
                          onClick={() => removeKeyword(cat, kw)}
                          aria-label={`Remove keyword ${kw}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="keyword-add-row">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add keyword..."
                      className="glass-input flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && addKeyword(cat)}
                      aria-label={`Add keyword for ${cat}`}
                    />
                    <button onClick={() => addKeyword(cat)} className="btn btn-primary" style={{ padding: '0.375rem 1rem' }}>
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transaction List with Category Override */}
      <div className="glass-panel glass-panel--static" style={{ overflow: 'hidden' }}>
        <div className="panel-body" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="section-header">
            <div>
              <h3 className="section-title">Transactions ({categorisedTransactions.length})</h3>
              {searchQuery && (
                <span className="section-subtitle">
                  Showing {filteredTransactions.length} of {categorisedTransactions.length} transactions
                </span>
              )}
            </div>
          </div>
          <p className="section-subtitle mb-3">Click a category to change it</p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description or category..."
            className="search-input"
            aria-label="Search transactions"
          />
        </div>
        <div className="glass-table-wrap">
          <table className="glass-table">
            <thead>
              <tr>
                {['Date', 'Description', 'Amount', 'Category'].map((h) => (
                  <th key={h} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.slice(0, 100).map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td className="truncate-cell">{tx.description}</td>
                  <td style={{ fontWeight: 500 }}>
                    <span className={tx.amount >= 0 ? 'value-positive' : 'value-negative'}>
                      £{tx.amount.toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <select
                      value={tx.category}
                      onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                      className="cat-select"
                      style={{ color: getCategoryColour(tx.category) }}
                      aria-label={`Category for ${tx.description}`}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length > 100 && (
          <div className="table-footer-info">
            Showing first 100 of {filteredTransactions.length} transactions
          </div>
        )}
      </div>
    </div>
  )
}
