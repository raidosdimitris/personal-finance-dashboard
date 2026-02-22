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
