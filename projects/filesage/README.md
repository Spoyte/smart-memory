# FileSage

Local natural language file search using embeddings.

## What it does

- Indexes files in specified directories
- Generates text embeddings for file content
- Search with natural language: "Python script that handles PDFs"
- Runs entirely locally — no cloud, no API keys

## Usage

```bash
# Index a directory
filesage index ~/projects

# Search
filesage search "authentication middleware"
filesage search "that script about image resizing"

# Re-index (update changed files)
filesage reindex

# Status
filesage status
```

## Tech

- Embeddings: Xenova/all-MiniLM-L6-v2 (local, runs on CPU)
- Database: SQLite with vector similarity search
- File parsing: native Node.js + extensions for PDF, DOCX, etc.
