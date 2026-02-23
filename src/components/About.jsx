export default function About() {
  return (
    <div className="section-stack" style={{ maxWidth: '48rem', margin: '0 auto' }}>
      {/* Privacy Hero */}
      <div className="about-hero">
        <div className="hero-icon" aria-hidden="true">🔒</div>
        <h2>Your data never leaves your browser</h2>
        <p>Everything runs 100% client-side. No servers, no uploads, no tracking.</p>
      </div>

      {/* Important Note: Not Connected to Your Bank */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>⚠️ Important: This Dashboard Is NOT Connected to Your Bank</h3>
        <div className="about-info-box">
          <p>
            This dashboard has <strong>no connection to any bank or financial institution</strong>. It cannot access your bank account, read your balance, or pull transactions automatically.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            It only works with the files <strong>you manually upload</strong>. You are always in full control of what data the dashboard sees.
          </p>
        </div>
      </div>

      {/* What Data the Dashboard Uses */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>📊 What Data the Dashboard Actually Uses</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          The dashboard generates all its charts and insights based on just <strong>four columns</strong> from your uploaded file:
        </p>
        <div className="about-column-grid">
          {[
            { name: 'Date', desc: 'Transaction date' },
            { name: 'Category', desc: 'Spending category' },
            { name: 'Merchant', desc: 'Where you spent' },
            { name: 'Amount', desc: 'Transaction amount' },
          ].map((col) => (
            <div key={col.name} className="about-column-card">
              <div className="col-name">{col.name}</div>
              <div className="col-desc">{col.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1rem', marginBottom: '0.75rem' }}>
          Here&apos;s an example of what the dashboard works with — nothing more:
        </p>
        <div className="glass-table-wrap">
          <table className="glass-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Category</th>
                <th scope="col">Merchant</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2024-01-15</td>
                <td>Groceries</td>
                <td>Tesco</td>
                <td>45.20</td>
              </tr>
              <tr>
                <td>2024-01-16</td>
                <td>Transport</td>
                <td>TfL</td>
                <td>2.80</td>
              </tr>
              <tr>
                <td>2024-01-17</td>
                <td>Eating Out</td>
                <td>Nando&apos;s</td>
                <td>18.50</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendation: Clean Your Files */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🧹 We Recommend Cleaning Your Files Before Uploading</h3>
        <div className="about-info-box">
          <p>
            Although this dashboard <strong>does not collect, store, or transmit any personal data</strong>, we strongly advise you to clean your raw bank statement files before uploading.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            Remove any columns you don&apos;t need (account numbers, balances, references, etc.) and keep only the four key columns: <strong>Date</strong>, <strong>Category</strong>, <strong>Merchant</strong>, and <strong>Amount</strong>.
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            This is a good privacy habit regardless of which tool you use — the less sensitive data in a file, the lower the risk if it ever ends up somewhere unintended.
          </p>
        </div>
      </div>

      {/* How It Works — Why We Don't Collect Data */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🔧 How It Works — And Why We Don&apos;t Collect Data</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          This dashboard is designed from the ground up to be <strong>100% client-side</strong>. Here&apos;s what that means:
        </p>
        <ul className="about-list">
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span><strong>No server or backend</strong> — the app is a static website. There is no server to send data to, even if someone wanted to.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span><strong>Files are read locally</strong> — your browser reads the file directly from your device using the File API. The data never leaves your machine.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span><strong>Data stays in browser memory</strong> — your transaction data exists only in your browser&apos;s RAM while the tab is open. It is not written to disk, cookies, or any database.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span><strong>Close the tab, data is gone</strong> — when you close the browser tab (or refresh the page), all uploaded data is permanently erased from memory. There is nothing to &quot;delete&quot; because nothing was saved.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>CSV parsing uses <strong>PapaParse</strong> and Excel uses <strong>SheetJS</strong> — both are JavaScript libraries that run entirely in your browser.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>Category rules are saved to <strong>localStorage</strong> — these are your custom rules (e.g. &quot;Tesco → Groceries&quot;), not transaction data. They stay on your device.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>Charts use <strong>Chart.js</strong> — rendered as canvas elements in your browser, with no external calls.</span>
          </li>
          <li>
            <span className="list-dot" aria-hidden="true">•</span>
            <span>A <strong>Content Security Policy</strong> is in place that blocks all outbound network requests (<code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>connect-src &apos;none&apos;</code>), making it technically impossible for JavaScript to send your data anywhere.</span>
          </li>
        </ul>
      </div>

      {/* Verify It Yourself */}
      <div className="glass-panel glass-panel--static about-section">
        <h3>🔍 Don&apos;t Take Our Word For It — Verify It Yourself</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          We believe in transparency. Here&apos;s how you can confirm the dashboard doesn&apos;t send your data anywhere:
        </p>

        <div className="about-info-box" style={{ marginBottom: '1rem' }}>
          <p><strong>👤 For non-technical users:</strong></p>
          <ol style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
            <li>Open the dashboard in your browser</li>
            <li>Press <strong>F12</strong> (or right-click → &quot;Inspect&quot;) to open Developer Tools</li>
            <li>Click the <strong>Network</strong> tab</li>
            <li>You&apos;ll see a list of requests — this is <strong>completely normal</strong>. These are the files your browser needs to display the dashboard. See the full breakdown below.</li>
            <li>Now click the 🚫 clear button (top-left of the Network panel) to clear the list</li>
            <li>Upload a file as normal</li>
            <li>Look at the Network tab again — you may see <strong>one or two requests</strong>, and both are harmless: a tiny embedded arrow icon (a <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>data:</code> image built into the CSS that never leaves your browser) and a font file loading from the dashboard&apos;s own site. <strong>No financial data is sent anywhere</strong> — your data was processed entirely inside your browser.</li>
          </ol>
        </div>

        <div className="about-info-box" style={{ marginBottom: '1rem' }}>
          <p><strong>📋 What are those requests when the page loads?</strong></p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
            When you first open the dashboard, your browser downloads the files it needs to display the app. Here&apos;s exactly what each one is:
          </p>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '2', listStyleType: 'disc' }}>
            <li><strong>The dashboard page itself</strong> — the main HTML file (the &quot;shell&quot; of the app)</li>
            <li><strong>One JavaScript file</strong> (<code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>index-xxxxx.js</code>) — the app&apos;s code that makes everything work</li>
            <li><strong>One CSS file</strong> (<code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>index-xxxxx.css</code>) — the visual styling (colours, layout)</li>
            <li><strong>Five font files</strong> (<code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>.woff2</code>) — the Barlow and DM Mono typefaces used for text</li>
            <li><strong>One or two tiny embedded icons</strong> (<code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>data:image/svg+xml</code>) — small shapes built into the CSS. These never leave your browser.</li>
          </ul>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Every request goes to <strong>raidosdimitris.github.io</strong> — the GitHub Pages site hosting this dashboard. No third-party servers are contacted. None of these requests contain your financial data.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            💡 <strong>Note:</strong> If you use browser extensions (like an ad blocker), you may see one or two extra requests from those extensions — these are not from the dashboard and are unrelated to your data.
          </p>
        </div>

        <div className="about-info-box">
          <p><strong>👩‍💻 For technical users:</strong></p>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.8', listStyleType: 'disc' }}>
            <li>Review the <a href="https://github.com/raidosdimitris/personal-finance-dashboard" target="_blank" rel="noopener noreferrer" className="about-link">open-source code on GitHub</a> — search for <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>fetch</code>, <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>XMLHttpRequest</code>, or <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>WebSocket</code> calls. You won&apos;t find any that transmit user data.</li>
            <li>Check the <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>Content-Security-Policy</code> meta tag in <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>index.html</code> — it includes <code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem' }}>connect-src &apos;none&apos;</code>, which blocks all JS-initiated network requests.</li>
            <li>Load the app once, then go offline (disable Wi-Fi or use DevTools to throttle to &quot;Offline&quot;). The dashboard continues to work perfectly because it needs no network.</li>
          </ul>
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
              a: 'Yes. Everything runs in your browser. No server, no database, no analytics. The Content Security Policy blocks all outbound network requests. Check the network tab yourself.',
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
              a: "In your browser's localStorage. They persist between visits but are tied to this browser. Your transaction data is NOT saved — only your custom rules.",
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
