const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DB_DIR = path.join(os.homedir(), '.clipkeep');
const DB_PATH = path.join(DB_DIR, 'history.db');

// Ensure directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'text',
    source TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME,
    access_count INTEGER DEFAULT 0
  );
  
  CREATE INDEX IF NOT EXISTS idx_category ON clips(category);
  CREATE INDEX IF NOT EXISTS idx_created ON clips(created_at);
  CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(content, content='clips', content_rowid='id');
  
  -- Triggers to keep FTS index in sync
  CREATE TRIGGER IF NOT EXISTS clips_ai AFTER INSERT ON clips BEGIN
    INSERT INTO clips_fts(rowid, content) VALUES (new.id, new.content);
  END;
  
  CREATE TRIGGER IF NOT EXISTS clips_ad AFTER DELETE ON clips BEGIN
    INSERT INTO clips_fts(clips_fts, rowid, content) VALUES ('delete', old.id, old.content);
  END;
`);

// Prepared statements
const insertStmt = db.prepare(`
  INSERT INTO clips (content, category, source) VALUES (?, ?, ?)
`);

const searchStmt = db.prepare(`
  SELECT c.* FROM clips c
  JOIN clips_fts f ON c.id = f.rowid
  WHERE clips_fts MATCH ?
  ORDER BY c.created_at DESC
  LIMIT ?
`);

const recentStmt = db.prepare(`
  SELECT * FROM clips ORDER BY created_at DESC LIMIT ?
`);

const getByCategoryStmt = db.prepare(`
  SELECT * FROM clips WHERE category = ? ORDER BY created_at DESC LIMIT ?
`);

const deleteOldStmt = db.prepare(`
  DELETE FROM clips WHERE created_at < datetime('now', ?)
`);

const getStatsStmt = db.prepare(`
  SELECT 
    COUNT(*) as total,
    COUNT(DISTINCT category) as categories,
    MAX(created_at) as last_clip
  FROM clips
`);

module.exports = {
  insert: (content, category, source = null) => {
    return insertStmt.run(content, category, source);
  },
  
  search: (query, limit = 20) => {
    return searchStmt.all(query, limit);
  },
  
  recent: (limit = 20) => {
    return recentStmt.all(limit);
  },
  
  byCategory: (category, limit = 20) => {
    return getByCategoryStmt.all(category, limit);
  },
  
  deleteOlderThan: (days) => {
    return deleteOldStmt.run(`-${days} days`);
  },
  
  stats: () => {
    return getStatsStmt.get();
  },
  
  close: () => db.close()
};
