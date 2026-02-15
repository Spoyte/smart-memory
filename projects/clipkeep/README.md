# ClipKeep - Smart Clipboard Manager

A clipboard history manager that auto-categorizes copied content and makes it searchable.

## Features

- **Background monitoring** — Watches clipboard in real-time
- **Auto-categorization** — Detects URLs, code, emails, phone numbers, addresses
- **Full-text search** — SQLite-backed with fast search
- **CLI + TUI** — Quick command-line access and interactive browser
- **Cross-platform** — Works on Linux, macOS, Windows

## Usage

```bash
# Start the background daemon
clipkeep daemon

# Search clipboard history
clipkeep search "meeting notes"

# Browse history interactively
clipkeep browse

# Show last 10 items
clipkeep recent

# Clear history older than 30 days
clipkeep clean --days 30
```

## Categories

- `url` — Web links (http/https)
- `email` — Email addresses
- `phone` — Phone numbers
- `code` — Code snippets (detected by structure)
- `address` — Physical addresses
- `text` — Plain text

## Tech Stack

- Node.js
- better-sqlite3 (fast SQLite)
- clipboardy (clipboard access)
- commander (CLI framework)
