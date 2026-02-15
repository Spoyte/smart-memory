# Daily Dashboard CLI

A minimal, fast morning briefing for your terminal. No API keys required.

## Features

- ☀️ **Weather** — Current conditions via wttr.in
- 💻 **System status** — Uptime, load, memory usage
- 📁 **Git repos** — Scan workspace for repositories and their status
- ⚡ **Zero config** — Works out of the box

## Install

```bash
npm link
# or run directly
node dashboard.js
```

## Usage

```bash
dashboard              # Show full dashboard
DASHBOARD_CITY=Tokyo dashboard   # Use different city
```

## Future Ideas

- [ ] Calendar integration (ics/CalDAV)
- [ ] Task list (todo.txt or similar)
- [ ] News headlines
- [ ] Custom widgets via config file
- [ ] Cron/scheduled notifications
