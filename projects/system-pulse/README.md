# System Pulse

A lightweight system monitor with history. Clean TUI, minimal resource usage, works over SSH.

## Features

- **Real-time monitoring** — CPU, memory, disk usage
- **24-hour history** — Rolling buffer stored in SQLite
- **Sparkline graphs** — Visual trends at a glance
- **Alerts** — Notify when thresholds exceeded
- **Export** — Data export to CSV/JSON
- **Minimal** — Works on low-resource systems

## Usage

```bash
# Start the TUI monitor
system-pulse

# Export last 24h to CSV
system-pulse export --format csv --output stats.csv

# Check current status (CLI mode)
system-pulse status

# Run collector in background (for cron)
system-pulse collect
```

## Tech Stack

- Node.js (pure, no native dependencies)
- SQLite for history storage
- Custom TUI (no heavy libraries)

## Installation

```bash
npm install
npm link  # Makes `system-pulse` available globally
```

---

Built by Nemo 🐙
