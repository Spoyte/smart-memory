const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, 'memories.jsonl');

// Simple tokenizer
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

// Create a simple term frequency vector
function vectorize(text, vocab) {
  const tokens = tokenize(text);
  const vec = {};
  for (const token of tokens) {
    vec[token] = (vec[token] || 0) + 1;
  }
  // Normalize
  const magnitude = Math.sqrt(Object.values(vec).reduce((a, b) => a + b * b, 0));
  for (const key of Object.keys(vec)) {
    vec[key] = vec[key] / (magnitude || 1);
  }
  return vec;
}

// Cosine similarity
function cosineSimilarity(a, b) {
  let dot = 0;
  for (const key of Object.keys(a)) {
    if (b[key]) dot += a[key] * b[key];
  }
  return dot;
}

// Load all memories
function loadMemories() {
  if (!fs.existsSync(MEMORY_FILE)) return [];
  return fs.readFileSync(MEMORY_FILE, 'utf-8')
    .trim()
    .split('\n')
    .filter(line => line)
    .map(line => JSON.parse(line));
}

// Save a memory
function saveMemory(text, metadata = {}) {
  const memory = {
    id: Date.now().toString(36),
    text,
    tokens: tokenize(text),
    timestamp: new Date().toISOString(),
    ...metadata
  };
  fs.appendFileSync(MEMORY_FILE, JSON.stringify(memory) + '\n');
  return memory;
}

// Search memories
function searchMemories(query, limit = 5) {
  const memories = loadMemories();
  if (memories.length === 0) return [];
  
  const queryVec = vectorize(query);
  
  return memories
    .map(m => ({
      ...m,
      score: cosineSimilarity(queryVec, vectorize(m.text))
    }))
    .filter(m => m.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// CLI
const [,, cmd, ...args] = process.argv;

if (cmd === 'add') {
  const text = args.join(' ');
  if (!text) {
    console.error('Usage: node memory.js add <text>');
    process.exit(1);
  }
  const memory = saveMemory(text);
  console.log(`✓ Saved memory ${memory.id}`);
  
} else if (cmd === 'search') {
  const query = args.join(' ');
  if (!query) {
    console.error('Usage: node memory.js search <query>');
    process.exit(1);
  }
  const results = searchMemories(query);
  if (results.length === 0) {
    console.log('No relevant memories found.');
  } else {
    console.log(`Found ${results.length} relevant memories:\n`);
    results.forEach((m, i) => {
      console.log(`${i + 1}. [${(m.score * 100).toFixed(1)}%] ${m.text}`);
      console.log(`   ${new Date(m.timestamp).toLocaleString()}\n`);
    });
  }
  
} else if (cmd === 'list') {
  const memories = loadMemories().slice(-10).reverse();
  console.log(`Last ${memories.length} memories:\n`);
  memories.forEach(m => {
    console.log(`• ${m.text}`);
    console.log(`  ${new Date(m.timestamp).toLocaleString()}\n`);
  });
  
} else {
  console.log(`
Smart Memory - Semantic note storage

Usage:
  node memory.js add <text>     Save a new memory
  node memory.js search <query> Find relevant memories
  node memory.js list           Show recent memories
`);
}
