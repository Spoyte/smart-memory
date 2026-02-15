# task-cli

Simple, persistent task management with natural language dates. No dependencies, zero setup.

## Install

```bash
# Clone or copy the script
chmod +x tasks.js

# Optional: add to PATH
ln -s $(pwd)/tasks.js /usr/local/bin/tasks
```

## Usage

```bash
tasks add "description [by DATE] [!priority] [#tag]"   # Add a new task
tasks list [priority] [#tag]                           # List pending tasks
tasks done <id>                                        # Mark task complete
tasks remove <id>                                      # Delete a task
tasks search <query>                                   # Search tasks
tasks stats                                            # Show statistics
tasks help                                             # Show help
```

## Date Formats

Natural language dates work out of the box:

- `by tomorrow` — Due tomorrow at 9am
- `by today` — Due today at 5pm
- `by next week` — Due in 7 days
- `in 3 days`, `in 2 hours` — Relative time
- `by Friday`, `by 2026-02-20` — Specific dates

## Examples

```bash
tasks add "review PR by tomorrow #work !high"
tasks add "call mom on Sunday"
tasks add "deploy to production by Friday 5pm !urgent"
tasks add "buy groceries in 2 hours #personal"

tasks list              # Show all pending
tasks list urgent       # Filter by priority
tasks list #work        # Filter by tag
tasks done abc123       # Complete task
tasks search "review"   # Find tasks
```

## Features

- ✨ Natural language date parsing
- 🏷️ Tags with `#tag` syntax
- ⚡ Priority levels with `!urgent`, `!high`, `!low`
- 📊 Statistics and filtering
- 🎨 Color-coded output
- 💾 JSON storage at `~/.tasks.json`
- 🔍 Full-text search
- 📱 Short ID matching (use last 6 chars)

## Storage

Tasks are stored in `~/.tasks.json`. Back it up, sync it, version it — it's just JSON.

## License

MIT
