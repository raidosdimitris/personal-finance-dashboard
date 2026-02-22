import { useState, useRef, useEffect, useCallback } from 'react'
import UploadClean from './components/UploadClean'
import Categorise from './components/Categorise'
import Dashboard from './components/Dashboard'
import Export from './components/Export'
import About from './components/About'

/* ============================================================
   TAB CONFIGURATION
   Each tab: id, label (visible), icon, subtitle, panelId
   ============================================================ */
const TABS = [
  { id: 'upload', label: 'Upload & Clean', icon: '📤', subtitle: 'Import data', step: 1 },
  { id: 'categorise', label: 'Categorise', icon: '🏷️', subtitle: 'Label transactions', step: 2 },
  { id: 'dashboard', label: 'Dashboard', icon: '📊', subtitle: 'Visualise', step: 3 },
  { id: 'export', label: 'Export', icon: '💾', subtitle: 'Download', step: 4 },
  { id: 'about', label: 'About & Privacy', icon: 'ℹ️', subtitle: 'How it works', step: 5 },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('upload')
  const [transactions, setTransactions] = useState([])
  const [categorisedTransactions, setCategorisedTransactions] = useState([])

  /* Track completed steps for step indicator */
  const completedSteps = new Set()
  if (transactions.length > 0) completedSteps.add('upload')
  if (categorisedTransactions.length > 0) {
    completedSteps.add('categorise')
    completedSteps.add('upload')
  }

  /* Calculate progress % */
  const activeIndex = TABS.findIndex((t) => t.id === activeTab)
  const progressPct = ((activeIndex + 1) / TABS.length) * 100

  /* Keyboard navigation for tabs */
  const tabListRef = useRef(null)

  const handleTabKeyDown = useCallback((e) => {
    const tabs = TABS.map((t) => t.id)
    const currentIdx = tabs.indexOf(activeTab)
    let nextIdx = currentIdx

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIdx = (currentIdx + 1) % tabs.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIdx = (currentIdx - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIdx = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIdx = tabs.length - 1
    }

    if (nextIdx !== currentIdx) {
      setActiveTab(tabs[nextIdx])
      /* Focus the new tab button */
      const tabBtn = tabListRef.current?.querySelector(`[data-tab-id="${tabs[nextIdx]}"]`)
      tabBtn?.focus()
    }
  }, [activeTab])

  return (
    <div className="app-root">
      <div className="app-container">
        {/* ============ HEADER ============ */}
        <header className="app-header">
          <h1 className="heading-display">Personal Finance Dashboard</h1>
          <p>Your data never leaves your browser</p>
        </header>

        {/* ============ TAB NAVIGATION ============ */}
        <nav className="tab-nav-container" aria-label="Dashboard navigation">
          <div className="glass-panel glass-panel--static glass-panel--flat">
            <div
              className="tab-nav"
              role="tablist"
              aria-label="Dashboard sections"
              ref={tabListRef}
              onKeyDown={handleTabKeyDown}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                const isCompleted = completedSteps.has(tab.id) && !isActive

                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    data-tab-id={tab.id}
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={isActive ? 0 : -1}
                    className={`tab-btn ${isCompleted ? 'tab-btn--completed' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="tab-step" aria-hidden="true">
                      {isCompleted ? '✓' : tab.step}
                    </span>
                    <span>
                      {tab.icon} {tab.label}
                      <span className="tab-subtitle">{tab.subtitle}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Progress bar */}
            <div className="tab-progress" role="progressbar" aria-valuenow={Math.round(progressPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Dashboard progress">
              <div className="tab-progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </nav>

        {/* ============ TAB PANELS ============ */}
        <main className="app-main">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              hidden={activeTab !== tab.id}
              className={activeTab === tab.id ? 'tab-panel-enter' : ''}
              tabIndex={0}
            >
              {activeTab === tab.id && (
                <>
                  {tab.id === 'upload' && (
                    <UploadClean
                      transactions={transactions}
                      setTransactions={setTransactions}
                      setCategorisedTransactions={setCategorisedTransactions}
                    />
                  )}
                  {tab.id === 'categorise' && (
                    <Categorise
                      transactions={transactions}
                      categorisedTransactions={categorisedTransactions}
                      setCategorisedTransactions={setCategorisedTransactions}
                    />
                  )}
                  {tab.id === 'dashboard' && (
                    <Dashboard transactions={categorisedTransactions} />
                  )}
                  {tab.id === 'export' && (
                    <Export transactions={categorisedTransactions} />
                  )}
                  {tab.id === 'about' && <About />}
                </>
              )}
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}
