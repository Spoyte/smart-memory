# New Project Ideas

Generated: Monday, February 16th, 2026 — 3:15 AM

## 1. Web Clipper & Read-It-Later Service
**Problem**: Bookmarking services like Pocket are slow, full of ads, and don't preserve content well.
**Solution**: A self-hosted read-it-later service that:
- Saves articles as clean Markdown
- Extracts main content automatically
- Full-text search across saved articles
- Tags and collections
- Export to various formats (PDF, EPUB)
**Tech**: Node.js + SQLite + readability library
**Value**: Personal knowledge management, works offline

## 2. API Gateway / Request Bouncer
**Problem**: Managing multiple API keys, rate limits, and request logging across projects.
**Solution**: A lightweight API gateway that:
- Proxies requests to external APIs
- Handles rate limiting intelligently
- Caches responses
- Logs all requests for debugging
- Rotates API keys automatically
**Tech**: Node.js + Redis + Express
**Value**: Centralized API management, cost savings through caching

## 3. Screenshot-to-Code Tool
**Problem**: Recreating UI from screenshots is tedious.
**Solution**: Upload a screenshot, get HTML/CSS code that approximates the layout.
- Uses vision models to detect components
- Generates Tailwind CSS classes
- Outputs clean, editable code
**Tech**: Python + OpenCV + optional LLM integration
**Value**: Rapid prototyping, learning UI patterns

## 4. Terminal Dashboard (TUI)
**Problem**: Monitoring multiple systems requires opening many tabs/tools.
**Solution**: A terminal-based dashboard that shows:
- System resources (CPU, memory, disk)
- Running processes
- Docker containers status
- Recent git commits
- Weather, calendar, todos
**Tech**: Rust (ratatui) or Python (rich/textual)
**Value**: Single-pane view of everything, works over SSH

## 5. Smart Clipboard Manager
**Problem**: System clipboard only remembers the last item.
**Solution**: A clipboard manager that:
- Remembers clipboard history
- Detects content type (URL, code, image, color)
- Smart search through history
- Auto-categorizes by app/source
- Sync across devices (optional)
**Tech**: Rust (cross-platform) or Python + tkinter
**Value**: Never lose copied content, find old clips quickly

## 6. Log File Analyzer
**Problem**: Reading log files is painful, grepping is limited.
**Solution**: A tool that:
- Parses common log formats (nginx, Apache, JSON)
- Shows real-time tail with filtering
- Pattern detection (error spikes, anomalies)
- Generates summary reports
- Export to various formats
**Tech**: Go or Rust for speed
**Value**: Debugging production issues faster

## 7. Local Search Engine
**Problem**: Finding files across projects is hard, Spotlight/Windows Search miss content.
**Solution**: A personal search engine that:
- Indexes all text files in specified directories
- Searches inside code, docs, notes
- Fuzzy matching for typos
- File content previews
- Fast (sub-second) queries
**Tech**: SQLite FTS5 + Tantivy (Rust) or Bleve (Go)
**Value**: Instant access to all your knowledge

## 8. HTTP Request Inspector (like RequestBin)
**Problem**: Debugging webhooks requires external services.
**Solution**: Self-hosted request inspector:
- Generates unique URLs to receive webhooks
- Shows full request details (headers, body, timing)
- Replays requests
- Compares multiple requests
- No external dependencies
**Tech**: Node.js + SQLite
**Value**: Debug webhooks locally, keep data private

## 9. Markdown Presentation Tool
**Problem**: PowerPoint is heavy, reveal.js requires setup.
**Solution**: CLI tool that converts Markdown to presentations:
- Write slides in Markdown
- Built-in themes
- Present in browser or terminal
- Export to PDF
- Speaker notes support
**Tech**: Node.js + remark + puppeteer
**Value**: Fast presentation creation, version control friendly

## 10. Git Hook Manager
**Problem**: Setting up git hooks across projects is inconsistent.
**Solution**: A tool that:
- Manages hooks in a central config
- Shares hooks across repos
- Conditional hooks (only run on certain branches)
- Pre-built hooks (lint, test, format)
- Easy installation per-repo
**Tech**: Python or Rust
**Value**: Consistent code quality across all projects

## 11. RSS Reader with AI Summaries
**Problem**: RSS feeds are noisy, too many articles to read.
**Solution**: An RSS reader that:
- Aggregates feeds
- Generates AI summaries of articles
- Filters by relevance (learns preferences)
- Daily/weekly digest emails
- Full-text search
**Tech**: Node.js + SQLite + local LLM or API
**Value**: Stay informed without information overload

## 12. Database Schema Visualizer
**Problem**: Understanding database relationships requires digging through migrations.
**Solution**: A tool that:
- Connects to any SQL database
- Generates ER diagrams
- Shows table relationships
- Tracks schema changes over time
- Export to various formats
**Tech**: Node.js + graphviz or mermaid
**Value**: Documentation that stays current

---

## Completed Projects

### ✅ Local Search Engine (#7)
**Status:** Built as `local-search` in `/projects/local-search/`
- Full-text indexing with inverted index
- Fast CLI search
- Zero dependencies

### ✅ Terminal Dashboard / System Monitor (#4)
**Status:** Built as `system-pulse` in `/projects/system-pulse/`
- Real-time CPU, memory, disk monitoring
- 24-hour history with sparkline graphs
- Export to CSV/JSON
- Zero dependencies

---

## Selected for Building: (Next up)

*See PROJECT_IDEAS_2026-02-16.md for latest ideas and selection*
