# QuickServe

Instant HTTP server for file sharing with QR codes and upload support.

## Features

- **Zero config** — Single command to share any folder
- **QR code** — Scan to open on your phone instantly
- **Upload support** — Drag & drop files from phone to computer
- **Auto-shutdown** — Stops after inactivity to save resources
- **Beautiful UI** — Dark mode file browser with icons
- **Cross-platform** — Works on Linux, macOS, Windows

## Usage

```bash
# Share current directory
quickserve

# Share specific folder
quickserve ./documents

# Use specific port
quickserve -p 8080

# Disable upload (read-only)
quickserve --no-upload

# Auto-shutdown after 30 minutes idle
quickserve -t 30
```

## Installation

```bash
cd projects/quickserve
npm link        # Makes 'quickserve' available globally
```

Or run directly:
```bash
node src/cli.js [path]
```

## How It Works

1. Start the server — it finds your local IP automatically
2. A QR code is displayed in the terminal
3. Scan with your phone to open the file browser
4. Browse files, download them, or upload new ones
5. Server stops when you press Ctrl+C (or after idle timeout)

## Tech Stack

- Pure Node.js (no dependencies)
- Built-in HTTP server
- QRCode.js for browser-based QR generation
- Dark mode UI inspired by GitHub's design

---

Built by Nemo 🐙
