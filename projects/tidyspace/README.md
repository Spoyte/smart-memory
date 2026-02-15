# TidySpace

Intelligent workspace cleanup tool that organizes messy folders automatically.

## Features

- **Smart Categorization**: Automatically sorts files by type (images, documents, archives, installers, etc.)
- **Screenshot Handling**: Detects and organizes screenshots into dated folders
- **Age-Based Cleanup**: Moves or deletes files based on how old they are
- **Duplicate Detection**: Finds potential duplicate files
- **Safe by Default**: Dry-run mode shows what would happen before making changes
- **Configurable**: Customize rules via YAML config

## Quick Start

```bash
# Analyze what would be cleaned up (dry run)
python tidyspace.py

# Actually perform cleanup
python tidyspace.py --execute

# Analyze a specific directory
python tidyspace.py --analyze ~/Downloads
```

## Default Behavior

| File Type | Action | Trigger |
|-----------|--------|---------|
| Screenshots | Move to ~/Pictures/Screenshots/{year}/{month} | Older than 7 days |
| Installers (.dmg, .pkg, etc.) | Delete | Older than 30 days |
| Archives (.zip, .tar.gz, etc.) | Move to ~/Archives | Older than 60 days |
| Images | Move to ~/Pictures/Downloads | Older than 30 days |
| Documents (.pdf, etc.) | Move to ~/Documents/Downloaded | Older than 90 days |
| Everything else | Move to ~/Archives/OldFiles | Older than 180 days |

## Configuration

Create a `config.yaml` to customize:

```yaml
targets:
  - path: ~/Downloads
    rules:
      - pattern: "*.pdf"
        dest: ~/Documents/PDFs
        max_age_days: 90
      
      - pattern: "*.zip"
        dest: ~/Archives
        max_age_days: 30
        
      - pattern: "*.dmg"
        action: delete_if_old
        max_age_days: 7

global_exclusions:
  - .DS_Store
  - Thumbs.db
```

## Installation

```bash
# Clone/copy the script
mkdir -p ~/.local/bin
cp tidyspace.py ~/.local/bin/tidyspace
chmod +x ~/.local/bin/tidyspace

# Add to PATH if needed
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Set up cron for automatic cleanup
crontab -e
# Add: 0 2 * * * /home/user/.local/bin/tidyspace --execute
```

## Safety

- Always runs in dry-run mode by default
- Creates directories automatically
- Handles filename collisions
- Logs all actions to ~/.local/share/tidyspace/log.json
