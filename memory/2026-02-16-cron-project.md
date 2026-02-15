# Project Ideas — February 16, 2026 (3:46 AM)

## New Ideas Generated

### Tools That Solve Real Problems
1. **Task/Reminder CLI** — Simple, persistent task management with natural language due dates ✅
2. **Port Scanner + Service Detector** — Quick network reconnaissance tool
3. **JSON/YAML/CSV Converter** — Universal data format transformer with validation
4. **Directory Size Analyzer** — Find what's eating your disk space (like `ncdu` but simpler)
5. **Config File Linter** — Validate common config files (JSON, YAML, TOML, .env)

### Experiments with New Tech
6. **Static Site Generator** — Markdown → HTML with themes and live reload
7. **WebSocket Echo Server** — Real-time messaging playground
8. **Image Optimization Pipeline** — Batch compress/convert images

### Automations That Save Time
9. **Git Repo Sync Tool** — Auto-commit, sync across remotes, backup to cloud
10. **Dependency Update Checker** — Scan projects for outdated packages
11. **Template Scaffolder** — Generate boilerplate for common project types

### Fun/Learning Projects
12. **ASCII Art Generator** — Convert images to terminal-friendly ASCII
13. **Password Generator + Strength Checker** — Secure credential tools
14. **QR Code Generator/Reader** — Encode/decode QR codes in terminal

---

## Selected: Task/Reminder CLI

**Why this one:**
- Different from existing tools (fills a gap in the ecosystem)
- Immediately useful for daily work
- Natural language date parsing is interesting technically
- Can integrate with cron for reminders

**Features:**
- Add tasks with natural language: `task add "review PR tomorrow at 3pm"`
- List/filter by status, priority, due date
- Mark complete, archive old tasks
- Recurring tasks support
- Simple JSON storage
- Export to various formats

**Name:** `task-cli` or just `tasks`

---

## Build Log

### Phase 1: Core Data Model ✅
- Task schema: id, title, description, created, due, completed, priority, tags, recurring
- JSON file storage (~/.tasks.json)
- CRUD operations

### Phase 2: Natural Language Dates ✅
- Parse "tomorrow", "next week", "in 3 days"
- Parse specific times: "3pm", "15:00"
- Relative + absolute combinations

### Phase 3: CLI Interface ✅
- `tasks add "..."` — Create task
- `tasks list` — Show pending tasks
- `tasks done <id>` — Mark complete
- `tasks remove <id>` — Delete task
- `tasks search <query>` — Find tasks

### Phase 4: Extras ✅
- Priority levels (low, normal, high, urgent)
- Tags for organization
- Archive completed tasks
- Export (JSON, CSV, Markdown)

### Final: Documentation ✅
- README with examples
- Help text built-in

---

## Completed

Built a fully functional task CLI with:
- Natural language date parsing (tomorrow, next week, in X days/hours)
- Priority markers (!urgent, !high, !low)
- Tags (#work, #personal)
- Color-coded terminal output
- Search and filter capabilities
- Statistics view
- Zero dependencies

**Location:** `/root/.openclaw/workspace/projects/task-cli/`

**Files:**
- `tasks.js` — Main CLI (13KB, pure Node.js)
- `package.json` — Package manifest
- `README.md` — Documentation

**Tested:**
- Adding tasks with various date formats
- Listing with priority sorting
- Marking tasks complete
- Searching tasks
- Statistics display

