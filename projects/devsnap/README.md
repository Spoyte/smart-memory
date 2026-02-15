# devsnap

Development Environment Snapshot & Restore — Time Machine for your dev setup.

## What It Does

`devsnap` captures your complete development environment and lets you restore it on any machine:

- **Configuration files** — `.bashrc`, `.vimrc`, `.gitconfig`, SSH configs, etc.
- **Installed packages** — npm, pip, cargo, brew, apt
- **Environment variables** — Important env vars you rely on
- **Directory backups** — Neovim, VS Code, Fish configs, etc.
- **Git & SSH configs** — Version control and authentication setup

## Installation

```bash
# Clone or copy the project
cd projects/devsnap

# Link globally
npm link
# Or use directly
./devsnap.js
```

## Usage

### Create a Snapshot

```bash
devsnap snap                    # Auto-named snapshot
devsnap snap my-laptop-setup    # Named snapshot
```

### List Snapshots

```bash
devsnap list
```

### View Snapshot Details

```bash
devsnap show my-laptop-setup
```

### Restore From Snapshot

```bash
# Preview what would change
devsnap restore my-laptop-setup

# Actually restore (backs up existing files first)
devsnap restore my-laptop-setup --force
```

### Compare Snapshots

```bash
devsnap diff snap-2024-01 snap-2024-02
```

### Export/Import

```bash
# Export for transfer to another machine
devsnap export my-laptop-setup ~/backups/

# Import on new machine
devsnap import ~/backups/my-laptop-setup.devsnap.json
```

## Configuration

Edit what gets tracked:

```bash
devsnap config
```

Default tracked items:

**Files:**
- `~/.bashrc`, `~/.zshrc`, `~/.vimrc`
- `~/.gitconfig`, `~/.ssh/config`
- `~/.npmrc`, `~/.config/git/ignore`

**Directories:**
- `~/.config/nvim`
- `~/.config/vscode`
- `~/.config/fish`

**Environment Variables:**
- `EDITOR`, `SHELL`, `NODE_OPTIONS`
- `GOPATH`, `RUSTUP_HOME`, `CARGO_HOME`

## Storage

Snapshots are stored in `~/.devsnap/` as JSON files. Each snapshot includes:

- System information (OS, arch, hostname)
- Package lists from all detected package managers
- Backed up config files (content, not just paths)
- Environment variables
- Git and SSH configurations

## Use Cases

1. **New machine setup** — Restore your entire environment in minutes
2. **Dotfiles version control** — Track changes to your configs over time
3. **Team onboarding** — Share a snapshot for consistent dev environments
4. **Disaster recovery** — Quick restore after system failures
5. **Experimentation** — Try new setups, easily rollback

## Safety

- Existing files are backed up before being overwritten (`.backup.<timestamp>`)
- `--dry-run` flag to preview changes
- `--force` flag required for actual restoration
- SSH private keys are **never** captured (only public keys)
