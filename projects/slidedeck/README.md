# SlideDeck

A CLI tool that converts Markdown to beautiful HTML presentations. Write slides in Markdown, present in your browser.

## Features

- **Markdown-native**: Write presentations in plain Markdown
- **Live reload**: Auto-refresh as you edit
- **Built-in themes**: Clean, professional slide designs
- **Speaker notes**: Add notes that only you can see
- **Keyboard navigation**: Arrow keys, space, or vim bindings
- **Export to PDF**: Print-friendly output
- **Code highlighting**: Syntax highlighting for code blocks
- **Zero dependencies**: Single binary, works offline

## Installation

```bash
npm install
npm link  # Makes `slidedeck` available globally
```

## Quick Start

```bash
# Create a new presentation
slidedeck init my-talk

# Start presentation server
slidedeck serve my-talk/slides.md

# Or just open in browser
slidedeck open my-talk/slides.md
```

## Markdown Format

Separate slides with `---`:

```markdown
# My Presentation

Welcome to my talk!

---

## First Slide

- Point one
- Point two
- Point three

---

## Code Example

```javascript
function hello() {
  console.log("Hello, World!");
}
```

---

## The End

Questions?

<!-- Speaker notes: Remember to mention the Q&A session -->
```

## Commands

```bash
slidedeck init <name>          # Create new presentation
slidedeck serve <file>         # Start server with live reload
slidedeck open <file>          # Open in browser (no server)
slidedeck export <file>        # Export to static HTML
slidedeck pdf <file>           # Generate PDF
slidedeck themes               # List available themes
```

## Themes

- `default` - Clean, minimal
- `dark` - Dark mode
- `code` - Developer-focused
- `minimal` - Ultra-minimal

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| →, ↓, Space | Next slide |
| ←, ↑ | Previous slide |
| F | Fullscreen |
| S | Toggle speaker notes |
| . | Black screen |

## License

MIT
