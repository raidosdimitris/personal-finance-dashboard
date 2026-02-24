<div align="center">

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   💰  Personal Finance Dashboard                        ║
║                                                          ║
║   Upload · Clean · Categorise · Visualise · Export       ║
║                                                          ║
║   🔒 100% Client-Side — Your data never leaves          ║
║      your browser                                        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

[![MIT Licence](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-brightgreen)](https://raidosdimitris.github.io/personal-finance-dashboard/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/raidosdimitris/personal-finance-dashboard/pulls)
[![Made with React](https://img.shields.io/badge/made%20with-React-61DAFB.svg)](https://reactjs.org)

</div>

---

> **📸 Screenshot placeholder** — _add a screenshot here once the app is live_

---

## ✨ Features

- 📤 **Upload & Clean** — Drag-and-drop CSV/Excel files with auto bank format detection
- 🏦 **Multi-Bank Support** — Monzo, Starling, Revolut, HSBC, Barclays, Nationwide (+ manual mapping)
- 🧹 **Smart Cleaning** — Strips account numbers & sort codes, normalises dates, deduplicates
- 🏷️ **Auto-Categorisation** — Keyword-based rules for groceries, transport, dining, subscriptions & more
- ✏️ **Manual Overrides** — Click any category to change it; add custom categories
- 📊 **Interactive Dashboard** — Monthly spending, category breakdown (donut), top merchants, recurring payments
- 📈 **Income vs Expenses** — See your net position at a glance
- 🔮 **Projections** — Forecast next month's spending by category and merchant using weighted moving averages
- 🔍 **Filters** — Date range and category filters for insights
- 💾 **Export** — CSV, chart PNGs, and PDF summary reports
- 🔒 **100% Private** — No server, no uploads, no tracking. Everything runs in your browser.

---

## 🔒 Privacy & Security

| | |
|---|---|
| 🖥️ **Client-side only** | All processing happens in your browser using the File API |
| 🚫 **No server** | Zero network requests with your data |
| 🧹 **Data cleaning** | Account numbers, sort codes, and card numbers are stripped |
| 💾 **localStorage** | Category rules saved locally — never transmitted |
| 👀 **Verify yourself** | Open DevTools → Network tab to confirm |

---

## 🏦 Supported Banks

| Bank | Auto-Detect | Format |
|------|:-----------:|--------|
| Monzo | ✅ | CSV export from app |
| Starling | ✅ | CSV export |
| Revolut | ✅ | CSV/Excel export |
| HSBC | ✅ | CSV download |
| Barclays | ✅ | CSV export |
| Nationwide | ✅ | CSV download |
| **Other** | Manual | Use column mapping fallback |

---

## 🚀 Quick Start

### Visit the live app

👉 [**raidosdimitris.github.io/personal-finance-dashboard**](https://raidosdimitris.github.io/personal-finance-dashboard/)

### Run locally

```bash
git clone https://github.com/raidosdimitris/personal-finance-dashboard.git
cd personal-finance-dashboard
npm install
npm run dev
```

Open [http://localhost:5173/personal-finance-dashboard/](http://localhost:5173/personal-finance-dashboard/)

---

## 🛠️ Tech Stack

- **React 18** + **Vite** — fast dev & build
- **Tailwind CSS** — utility-first styling
- **PapaParse** — CSV parsing
- **SheetJS (xlsx)** — Excel parsing
- **Chart.js** + **react-chartjs-2** — charts
- **jsPDF** — PDF export

---

## 💡 Why This Stack & Architecture

> This section explains the reasoning behind every technical choice.

### The Core Constraint: Privacy First

The single most important architectural decision was **100% client-side processing**. Financial data is deeply personal. No server means no breach surface, no compliance overhead, no trust required. Users can verify this themselves — open DevTools, check the Network tab, and see zero outbound requests with their data.

This constraint shaped every library choice:

### Why React + Vite (not Next.js, not a server framework)

- **No SSR needed** — there's no server, no API routes, no database. A static SPA is the simplest correct architecture.
- **Vite** over CRA because it's faster, leaner, and doesn't carry webpack baggage. For a tool that ships as static files to GitHub Pages, build speed and bundle size matter.
- **React 18** because the component model fits naturally — each step (Upload → Clean → Categorise → Dashboard → Export) maps to a component with clear data flow.

### Why Tailwind CSS

- Utility-first means the styling is co-located with the markup. In a project where the UI was iterated rapidly with AI assistance, this kept the feedback loop tight — no jumping between CSS files.
- The glassmorphism theme is built on top of Tailwind's utilities plus custom CSS properties, keeping the design system consistent without a heavy UI library.

### Why PapaParse + SheetJS (not a custom parser)

- Bank CSV formats are wildly inconsistent. PapaParse handles edge cases (quoted fields, encoding, line endings) that a hand-rolled parser would miss.
- SheetJS adds Excel support with minimal overhead. Users shouldn't need to convert files before uploading.
- Both run entirely in-browser — no server round-trips.

### Why Chart.js (not D3, not Recharts)

- **Chart.js** hits the sweet spot: good-looking charts out of the box, responsive, and well-documented. D3 would be overkill for bar/donut charts. Recharts adds unnecessary abstraction.
- **react-chartjs-2** provides thin React bindings without fighting the library.

### Why jsPDF (not server-generated PDFs)

- PDF generation must happen client-side to maintain the privacy guarantee. jsPDF is mature, handles tables via the autotable plugin, and produces clean output.

### On Being "Vibe Coded"

This dashboard was built by prompting Claude (Anthropic) and iterating on the output. That's a deliberate choice, not a shortcut:

- **The architecture, data flow, and privacy model were designed by me.** The AI helped write the implementation.

AI-assisted development is a tool. The thinking behind *what* to build and *why* is still human.


---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please follow existing code style and add tests where possible.

---

## 📜 Licence

[MIT](LICENSE) — free to use, modify, and distribute.
