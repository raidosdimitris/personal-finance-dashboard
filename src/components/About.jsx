export default function About() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Privacy Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-8 text-white text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-2xl font-bold">Your data never leaves your browser</h2>
        <p className="mt-2 text-blue-100">
          Everything runs 100% client-side. No servers, no uploads, no tracking.
        </p>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">🔧 How It Works</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-blue-500">•</span>
            <span>Files are read using the <strong>File API</strong> — your browser reads the file directly from your device</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">•</span>
            <span>CSV parsing uses <strong>PapaParse</strong> and Excel uses <strong>SheetJS</strong> — both run in your browser</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">•</span>
            <span><strong>No data is sent to any server</strong> — check the network tab in DevTools to verify</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">•</span>
            <span>Category rules are saved to <strong>localStorage</strong> — stays on your device</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">•</span>
            <span>Charts use <strong>Chart.js</strong> — rendered as canvas elements in your browser</span>
          </li>
        </ul>
      </div>

      {/* Data Cleaning */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">🧹 How Cleaning Strips Sensitive Data</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• <strong>Sort codes</strong> (XX-XX-XX format) are replaced with ***</li>
          <li>• <strong>Account numbers</strong> (8-digit sequences) are replaced with ****</li>
          <li>• <strong>Card numbers</strong> are stripped from descriptions</li>
          <li>• Original files are never modified — only the in-memory copy is cleaned</li>
        </ul>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          💡 If you&apos;re uncomfortable uploading your raw bank statement, you can create a simple spreadsheet with just four columns: <strong>Date</strong>, <strong>Amount</strong>, <strong>Merchant</strong>, and <strong>Category</strong>. The dashboard only needs these columns to generate all charts and insights — no account numbers, balances, or other sensitive fields required.
        </div>
      </div>

      {/* Required Columns */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">📋 What Columns Are Needed</h3>
        <p className="text-sm text-gray-600 mb-3">
          At minimum, your file needs these columns (auto-detected for supported banks):
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="font-semibold text-blue-700">Date</div>
            <div className="text-gray-500 text-xs">Transaction date</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="font-semibold text-blue-700">Description</div>
            <div className="text-gray-500 text-xs">Merchant/payee name</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="font-semibold text-blue-700">Amount</div>
            <div className="text-gray-500 text-xs">Transaction amount</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="font-semibold text-blue-700">Category</div>
            <div className="text-gray-500 text-xs">Spending category</div>
          </div>
        </div>
      </div>

      {/* Supported Banks */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">🏦 Supported Banks</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {['Monzo', 'Starling', 'Revolut', 'HSBC', 'Barclays', 'Nationwide'].map((bank) => (
            <div key={bank} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
              <span className="text-green-500">✓</span>
              <span className="font-medium">{bank}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Other banks work too — just use the manual column mapping feature.
        </p>
      </div>

      {/* LLM Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">🤖 AI-Powered Categorisation (Coming Soon)</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
          <p className="text-yellow-800 font-medium mb-2">🚧 In Development</p>
          <ul className="space-y-1 text-yellow-700">
            <li>• Use your own API key (OpenAI, Anthropic, etc.)</li>
            <li>• Only transaction descriptions are sent — no amounts, dates, or account info</li>
            <li>• Smarter categorisation that learns from your corrections</li>
            <li>• Completely optional — keyword rules work great on their own</li>
          </ul>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">❓ FAQ</h3>
        <div className="space-y-4 text-sm">
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
              q: 'My bank isn\'t auto-detected. What do I do?',
              a: 'Use the manual column mapping. Select which columns correspond to Date, Description, Amount, and Category.',
            },
            {
              q: 'Where are my category rules saved?',
              a: 'In your browser\'s localStorage. They persist between visits but are tied to this browser.',
            },
            {
              q: 'Can I contribute?',
              a: 'Yes! The project is open source under MIT. PRs welcome.',
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <div className="font-medium text-gray-900">{q}</div>
              <div className="text-gray-600 mt-1">{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3">🔗 Links</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://github.com/raidosdimitris/personal-finance-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              📂 GitHub Source Code
            </a>
          </li>
          <li>
            <span className="text-gray-600">📜 MIT Licence — free to use, modify, and distribute</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
