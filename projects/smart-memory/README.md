# Smart Memory

A lightweight semantic memory system for AI assistants. Stores notes with vector embeddings for context retrieval.

## Usage

```bash
# Add a memory
node memory.js add "User prefers dark mode in all apps"

# Search memories
node memory.js search "user preferences"

# List recent memories
node memory.js list
```

## How It Works

- Uses simple TF-IDF-like vectorization (no external API calls)
- Stores in local JSONL file
- Fast cosine similarity search
- Automatically tags with timestamps
