export default function About() {
  return (
    <div className="section-stack" style={{ maxWidth: '48rem', margin: '0 auto' }}>
      {/* Privacy Hero */}
      <div className="about-hero">
        <div className="hero-icon" aria-hidden="true">🔒</div>
        <h2>Your data never leaves your browser</h2>
        <p>Everything runs 100% client-side. No servers, no uploads, no tracking.</p>
      </div>

      {/* How It Works */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🔧 How It Works</h3>
        <ul className="about-list">
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>Files are read using the <strong>File API</strong> — your browser reads the file directly from your device</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>CSV parsing uses <strong>PapaParse</strong> and Excel uses <strong>SheetJS</strong> — both run in your browser</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span><strong>No data is sent to any server</strong> — check the network tab in DevTools to verify</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>Category rules are saved to <strong>localStorage</strong> — stays on your device</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>Charts use <strong>Chart.js</strong> — rendered as canvas elements in your browser</span>
          </li>
        </ul>
      </div>

      {/* Data Cleaning */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🧹 How Cleaning Strips Sensitive Data</h3>
        <ul className="about-list">
          <li><span className="list-dot" aria-hidden="true">•</span><span><strong>Sort codes</strong> (XX-XX-XX format) are replaced with ***</span></li>
          <li><span className="list-dot" aria-hidden="true">•</span><span><strong>Account numbers</strong> (8-digit sequences) are replaced with ****</span></li>
          <li><span className="list-dot" aria-hidden="true">•</span><span><strong>Card numbers</strong> are stripped from descriptions</span></li>
          <li><span className="list-dot" aria-hidden="true">•</span><span>Original files are never modified — only the in-memory copy is cleaned</span></li>
        </ul>
        <div className="about-info-box mt-4">
          💡 If you&apos;re uncomfortable uploading your raw bank statement, you can create a simple spreadsheet with just four columns: <strong>Date</strong>, <strong>Amount</strong>, <strong>Merchant</strong>, and <strong>Category</strong>. The dashboard only needs these columns to generate all charts and insights — no account numbers, balances, or other sensitive fields required.
        </div>
      </div>

      {/* Required Columns */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>📋 What Columns Are Needed</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          At minimum, your file needs these columns (auto-detected for supported banks):
        </p>
        <div className="about-column-grid">
          {[
            { name: 'Date', desc: 'Transaction date' },
            { name: 'Description', desc: 'Merchant/payee name' },
            { name: 'Amount', desc: 'Transaction amount' },
            { name: 'Category', desc: 'Spending category' },
          ].map((col) => (
            <div key={col.name} className="about-column-card">
              <div className="col-name">{col.name}</div>
              <div className="col-desc">{col.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Banks */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🏦 Supported Banks</h3>
        <div className="about-bank-grid">
          {['Monzo', 'Starling', 'Revolut', 'HSBC', 'Barclays', 'Nationwide'].map((bank) => (
            <div key={bank} className="about-bank-item">
              <span className="check-icon" aria-hidden="true">✓</span>
              <span>{bank}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          Other banks work too — just use the manual column mapping feature.
        </p>
      </div>

      {/* AI Section */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🤖 AI-Powered Categorisation (Coming Soon)</h3>
        <div className="about-dev-notice">
          <p className="notice-title">🚧 In Development</p>
          <ul>
            <li>Use your own API key (OpenAI, Anthropic, etc.)</li>
            <li>Only transaction descriptions are sent — no amounts, dates, or account info</li>
            <li>Smarter categorisation that learns from your corrections</li>
            <li>Completely optional — keyword rules work great on their own</li>
          </ul>
        </div>
      </div>

      {/* FAQ */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>❓ FAQ</h3>
        <div className="section-stack" style={{ gap: '1rem' }}>
          {[
            {
              q: 'Is my data really private?',
              a: 'Yes. Everything runs in your browser. No server, no database, no analytics. Check the network tab yourself.',
            },
            {
              q: 'Can I use this offline?',
              a: 'Once loaded, yes! The app runs entirely in your browser with no server calls.',
            },
            {
              q: "My bank isn't auto-detected. What do I do?",
              a: 'Use the manual column mapping. Select which columns correspond to Date, Description, Amount, and Category.',
            },
            {
              q: 'Where are my category rules saved?',
              a: "In your browser's localStorage. They persist between visits but are tied to this browser.",
            },
            {
              q: 'Can I contribute?',
              a: 'Yes! The project is open source under MIT. PRs welcome.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="about-faq-item">
              <div className="about-faq-q">{q}</div>
              <div className="about-faq-a">{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🔗 Links</h3>
        <ul className="about-list">
          <li>
            <span className="list-dot" aria-hidden="true">📂</span>
            <a
              href="https://github.com/raidosdimitris/personal-finance-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="about-link"
            >
              GitHub Source Code
            </a>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">📜</span>
            <span style={{ color: 'var(--text-secondary)' }}>MIT Licence — free to use, modify, and distribute</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
