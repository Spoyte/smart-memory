const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'notifications.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

// Initialize schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      priority TEXT NOT NULL,
      title TEXT,
      message TEXT,
      data TEXT,
      channels TEXT,
      delivered_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivered_at DATETIME
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_source ON notifications(source)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_priority ON notifications(priority)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_created_at ON notifications(created_at)`);
});

module.exports = {
  insert: (params) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO notifications (source, priority, title, message, data, channels, delivered_to)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [params.source, params.priority, params.title, params.message, params.data, params.channels, params.delivered_to],
        function(err) {
          if (err) reject(err);
          else resolve({ lastInsertRowid: this.lastID });
        }
      );
    });
  },

  getRecent: (params) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?`,
        [params.limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getBySource: (params) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM notifications WHERE source = ? ORDER BY created_at DESC LIMIT ?`,
        [params.source, params.limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getCountSince: (params) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM notifications WHERE source = ? AND created_at > datetime('now', ?)`,
        [params.source, params.since],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  updateDelivered: (params) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE notifications SET delivered_to = ?, delivered_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [params.delivered_to, params.id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
};
