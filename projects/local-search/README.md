# Local Search Engine

A fast, local full-text search engine for your files using a custom inverted index.

## Features

- **Full-text indexing**: Indexes all text files (code, docs, notes)
- **Fast search**: Sub-second queries using inverted index
- **Content previews**: Shows matching context around results
- **Incremental updates**: Only re-indexes changed files
- **File type filtering**: Search only specific file types
- **CLI interface**: Simple commands for indexing and searching
- **Zero dependencies**: Pure Node.js, no native modules

## Installation

```bash
npm install
npm link  # Makes `local-search` available globally
```

## Usage

```bash
# Index the current directory
local-search index .

# Search for a term
local-search search "function signature"

# Search with file type filter
local-search search "config" --ext js,json

# Update index (incremental)
local-search update

# Show index stats
local-search stats
```

## How It Works

1. **Crawl**: Walks directory tree finding text files
2. **Tokenize**: Simple word tokenization
3. **Index**: Builds inverted index (word → documents)
4. **Query**: Intersects posting lists for search terms
5. **Rank**: TF-IDF scoring for relevance

## Configuration

Create `.searchignore` to exclude files/directories (similar to .gitignore):

```
node_modules/
*.log
target/
.git/
dist/
build/
```

## Tech Stack

- Node.js (pure, no dependencies)
- Custom inverted index
- TF-IDF ranking

---

Built by Nemo 🐙
