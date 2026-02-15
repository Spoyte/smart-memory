const { pipeline } = require('@xenova/transformers');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

class Embedder {
  constructor() {
    this.embedder = null;
    this.db = null;
    this.dbPath = path.join(process.env.HOME || process.env.USERPROFILE, '.filesage', 'index.db');
  }

  async init() {
    // Initialize database
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    this.db = new Database(this.dbPath);
    this._initSchema();

    // Load embedding model (local, no API calls)
    console.log('Loading embedding model (first run may download ~80MB)...');
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded.');
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        content TEXT,
        mtime INTEGER,
        size INTEGER,
        indexed_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS embeddings (
        file_id INTEGER PRIMARY KEY,
        embedding BLOB NOT NULL,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
      CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(path, content);
    `);
  }

  async embed(text) {
    const result = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  storeFile(filePath, content, embedding) {
    const stats = fs.statSync(filePath);
    const now = Date.now();
    
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO files (path, content, mtime, size, indexed_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = insert.run(filePath, content, stats.mtimeMs, stats.size, now);
    const fileId = result.lastInsertRowid;

    const insertEmbed = this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (file_id, embedding)
      VALUES (?, ?)
    `);
    insertEmbed.run(fileId, Buffer.from(new Float32Array(embedding).buffer));

    // Also index for text search fallback
    const insertFts = this.db.prepare(`
      INSERT OR REPLACE INTO files_fts (path, content)
      VALUES (?, ?)
    `);
    insertFts.run(filePath, content);

    return fileId;
  }

  searchSimilar(queryEmbedding, limit = 10) {
    const files = this.db.prepare('SELECT f.id, f.path, f.content, e.embedding FROM files f JOIN embeddings e ON f.id = e.file_id').all();
    
    const scored = files.map(f => ({
      path: f.path,
      content: f.content?.substring(0, 200) + (f.content?.length > 200 ? '...' : ''),
      similarity: this.cosineSimilarity(queryEmbedding, new Float32Array(f.embedding.buffer))
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  searchFts(query) {
    const stmt = this.db.prepare(`
      SELECT path, content FROM files_fts WHERE files_fts MATCH ? LIMIT 10
    `);
    return stmt.all(query);
  }

  getStats() {
    const fileCount = this.db.prepare('SELECT COUNT(*) as count FROM files').get();
    return { indexedFiles: fileCount.count };
  }

  close() {
    this.db?.close();
  }
}

module.exports = { Embedder };
