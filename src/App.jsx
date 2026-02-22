import { useState } from 'react'
import UploadClean from './components/UploadClean'
import Categorise from './components/Categorise'
import Dashboard from './components/Dashboard'
import Export from './components/Export'
import About from './components/About'

const TABS = [
  { id: 'upload', label: '📤 Upload & Clean', icon: '📤' },
  { id: 'categorise', label: '🏷️ Categorise', icon: '🏷️' },
  { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
  { id: 'export', label: '💾 Export', icon: '💾' },
  { id: 'about', label: 'ℹ️ About & Privacy', icon: 'ℹ️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [transactions, setTransactions] = useState([])
  const [categorisedTransactions, setCategorisedTransactions] = useState([])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            💰 Personal Finance Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your data never leaves your browser
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'upload' && (
          <UploadClean
            transactions={transactions}
            setTransactions={setTransactions}
            setCategorisedTransactions={setCategorisedTransactions}
          />
        )}
        {activeTab === 'categorise' && (
          <Categorise
            transactions={transactions}
            categorisedTransactions={categorisedTransactions}
            setCategorisedTransactions={setCategorisedTransactions}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard transactions={categorisedTransactions} />
        )}
        {activeTab === 'export' && (
          <Export transactions={categorisedTransactions} />
        )}
        {activeTab === 'about' && <About />}
      </main>
    </div>
  )
}
