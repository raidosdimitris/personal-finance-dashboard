import { useState, useEffect } from 'react'
import {
  loadRules,
  saveRules,
  categoriseAll,
  getAllCategories,
  loadCustomCategories,
  saveCustomCategories,
  getCategoryColour,
} from '../utils/categoriser'

export default function Categorise({ transactions, categorisedTransactions, setCategorisedTransactions }) {
  const [rules, setRules] = useState(loadRules())
  const [categories, setCategories] = useState(getAllCategories())
  const [newCategory, setNewCategory] = useState('')
  const [editingRule, setEditingRule] = useState(null)
  const [newKeyword, setNewKeyword] = useState('')

  // Re-categorise when transactions change
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
    // Add empty rule
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
    // Re-categorise
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
    // Reset categories and re-apply rules
    const reset = transactions.map((tx) => ({ ...tx, category: '' }))
    setCategorisedTransactions(categoriseAll(reset))
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🏷️</div>
        <h2 className="text-xl font-semibold text-gray-700">No transactions to categorise</h2>
        <p className="text-gray-500 mt-1">Upload a bank statement first</p>
      </div>
    )
  }

  const categoryCounts = categorisedTransactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Category Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Category Summary</h2>
          <button
            onClick={recategoriseAll}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            🔄 Re-categorise All
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: getCategoryColour(cat) }}
            >
              {cat} ({categoryCounts[cat] || 0})
            </span>
          ))}
        </div>
      </div>

      {/* Add Custom Category */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">Custom Categories</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
          />
          <button
            onClick={addCustomCategory}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Category Rules Editor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">Category Rules (Keywords)</h3>
        <div className="space-y-3">
          {categories.filter((c) => c !== 'other').map((cat) => (
            <div key={cat} className="border border-gray-100 rounded-lg p-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setEditingRule(editingRule === cat ? null : cat)}
              >
                <span className="font-medium capitalize flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: getCategoryColour(cat) }}
                  />
                  {cat}
                </span>
                <span className="text-gray-400 text-sm">
                  {(rules[cat] || []).length} keywords {editingRule === cat ? '▲' : '▼'}
                </span>
              </div>
              {editingRule === cat && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(rules[cat] || []).map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {kw}
                        <button
                          onClick={() => removeKeyword(cat, kw)}
                          className="text-red-400 hover:text-red-600 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add keyword..."
                      className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && addKeyword(cat)}
                    />
                    <button
                      onClick={() => addKeyword(cat)}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                    >
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Transactions ({categorisedTransactions.length})</h3>
          <p className="text-sm text-gray-500">Click a category to change it</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'Description', 'Amount', 'Category'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categorisedTransactions.slice(0, 100).map((tx) => (
                <tr key={tx.id}>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{tx.date}</td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{tx.description}</td>
                  <td className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                    tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    £{tx.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={tx.category}
                      onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded px-2 py-1 capitalize"
                      style={{ color: getCategoryColour(tx.category) }}
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
        {categorisedTransactions.length > 100 && (
          <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
            Showing first 100 of {categorisedTransactions.length} transactions
          </div>
        )}
      </div>
    </div>
  )
}
