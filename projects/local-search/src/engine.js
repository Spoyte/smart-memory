const fs = require('fs');
const path = require('path');
const os = require('os');

const INDEX_DIR = path.join(os.homedir(), '.local-search');
const INDEX_PATH = path.join(INDEX_DIR, 'index.json');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PREVIEW_LENGTH = 120;

// Binary file extensions to skip
const BINARY_EXTENSIONS = new Set([
  'exe', 'dll', 'so', 'dylib', 'bin',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico',
  'mp3', 'mp4', 'avi', 'mov', 'mkv', 'wav', 'flac',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'o', 'obj', 'a', 'lib', 'class', 'pyc', 'pyo',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'db', 'sqlite', 'sqlite3'
]);

class SearchEngine {
  constructor() {
    if (!fs.existsSync(INDEX_DIR)) {
      fs.mkdirSync(INDEX_DIR, { recursive: true });
    }
    
    this.index = this.loadIndex();
  }

  loadIndex() {
    if (fs.existsSync(INDEX_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
      } catch (err) {
        return this.createEmptyIndex();
      }
    }
    return this.createEmptyIndex();
  }

  createEmptyIndex() {
    return {
      version: 1,
      documents: {}, // path -> { content, modified, size, extension }
      invertedIndex: {}, // word -> { path -> count }
      docFreq: {}, // word -> number of docs containing it
      totalDocs: 0,
      lastUpdated: null
    };
  }

  saveIndex() {
    fs.writeFileSync(INDEX_PATH, JSON.stringify(this.index, null, 2));
  }

  isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase().replace('.', '');
    return BINARY_EXTENSIONS.has(ext);
  }

  loadIgnorePatterns(dirPath) {
    const patterns = [
      'node_modules/',
      '.git/',
      '.svn/',
      '.hg/',
      'target/',
      'dist/',
      'build/',
      '.next/',
      '.nuxt/',
      'coverage/',
      '*.log',
      '.env',
      '.env.*',
      '*.min.js',
      '*.min.css',
      '.local-search-index/',
      '.local-search/'
    ];
    
    // Load .searchignore if exists
    const searchIgnorePath = path.join(dirPath, '.searchignore');
    const gitIgnorePath = path.join(dirPath, '.gitignore');
    
    let ignoreContent = '';
    if (fs.existsSync(searchIgnorePath)) {
      ignoreContent = fs.readFileSync(searchIgnorePath, 'utf8');
    } else if (fs.existsSync(gitIgnorePath)) {
      ignoreContent = fs.readFileSync(gitIgnorePath, 'utf8');
    }
    
    const lines = ignoreContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    patterns.push(...lines);
    
    return {
      ignores: (relativePath) => {
        for (const pattern of patterns) {
          const cleanPattern = pattern.replace(/\/$/, '');
          if (relativePath === cleanPattern || 
              relativePath.startsWith(cleanPattern + '/') ||
              relativePath.startsWith(cleanPattern + '\\')) {
            return true;
          }
          // Simple glob matching for *.ext
          if (pattern.startsWith('*.')) {
            const ext = pattern.slice(2);
            if (relativePath.endsWith('.' + ext)) return true;
          }
        }
        return false;
      }
    };
  }

  tokenize(text) {
    // Simple tokenization: lowercase, split on non-alphanumeric, filter short words
    return text.toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && w.length <= 50);
  }

  async indexDirectory(dirPath, force = false) {
    const startTime = Date.now();
    const ig = this.loadIgnorePatterns(dirPath);
    
    let filesIndexed = 0;
    let binaryFiles = 0;
    let ignoredFiles = 0;
    
    // If force, clear existing index for this directory
    if (force) {
      const toRemove = Object.keys(this.index.documents).filter(p => p.startsWith(dirPath));
      for (const p of toRemove) {
        this.removeDocument(p);
      }
    }
    
    const walkDir = (currentPath) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dirPath, fullPath);
        
        if (entry.isDirectory()) {
          if (!ig.ignores(relativePath + '/')) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          if (ig.ignores(relativePath)) {
            ignoredFiles++;
            continue;
          }
          
          if (this.isBinaryFile(fullPath)) {
            binaryFiles++;
            continue;
          }
          
          try {
            const stats = fs.statSync(fullPath);
            
            if (stats.size > MAX_FILE_SIZE) {
              continue;
            }
            
            // Check if already indexed and not modified
            const existing = this.index.documents[fullPath];
            if (existing && existing.modified === stats.mtime.getTime()) {
              continue; // Skip unchanged files
            }
            
            const content = fs.readFileSync(fullPath, 'utf8');
            const ext = path.extname(fullPath).toLowerCase().replace('.', '');
            
            // Remove old version if exists
            if (existing) {
              this.removeDocument(fullPath);
            }
            
            // Add new document
            this.addDocument(fullPath, entry.name, content, stats.mtime.getTime(), ext);
            
            filesIndexed++;
            
            if (filesIndexed % 100 === 0) {
              process.stdout.write(`\r  Indexed ${filesIndexed} files...`);
            }
          } catch (err) {
            ignoredFiles++;
          }
        }
      }
    };
    
    walkDir(dirPath);
    
    if (filesIndexed > 0) {
      process.stdout.write('\r');
    }
    
    this.index.lastUpdated = new Date().toISOString();
    this.saveIndex();
    
    return {
      filesIndexed,
      binaryFiles,
      ignoredFiles,
      duration: Date.now() - startTime
    };
  }

  addDocument(filePath, filename, content, modified, extension) {
    const tokens = this.tokenize(content);
    const wordCounts = {};
    
    for (const token of tokens) {
      wordCounts[token] = (wordCounts[token] || 0) + 1;
    }
    
    // Store document
    this.index.documents[filePath] = {
      filename,
      content: content.substring(0, 10000), // Store preview of content
      modified,
      size: content.length,
      extension,
      wordCount: tokens.length,
      uniqueWords: Object.keys(wordCounts).length
    };
    
    // Update inverted index
    for (const [word, count] of Object.entries(wordCounts)) {
      if (!this.index.invertedIndex[word]) {
        this.index.invertedIndex[word] = {};
        this.index.docFreq[word] = 0;
      }
      if (!this.index.invertedIndex[word][filePath]) {
        this.index.docFreq[word]++;
      }
      this.index.invertedIndex[word][filePath] = count;
    }
    
    this.index.totalDocs++;
  }

  removeDocument(filePath) {
    const doc = this.index.documents[filePath];
    if (!doc) return;
    
    // Remove from inverted index
    for (const [word, docs] of Object.entries(this.index.invertedIndex)) {
      if (docs[filePath]) {
        delete docs[filePath];
        this.index.docFreq[word]--;
        if (this.index.docFreq[word] <= 0) {
          delete this.index.invertedIndex[word];
          delete this.index.docFreq[word];
        }
      }
    }
    
    delete this.index.documents[filePath];
    this.index.totalDocs--;
  }

  async search(query, extensions = [], limit = 20) {
    const queryTokens = this.tokenize(query);
    
    if (queryTokens.length === 0) {
      return [];
    }
    
    // Get candidate documents that contain all query terms
    const candidateScores = {};
    
    for (const token of queryTokens) {
      const docs = this.index.invertedIndex[token];
      if (!docs) continue;
      
      const idf = Math.log(
        (this.index.totalDocs + 1) / (this.index.docFreq[token] + 1)
      ) + 1;
      
      for (const [docPath, count] of Object.entries(docs)) {
        const doc = this.index.documents[docPath];
        if (!doc) continue;
        
        // Filter by extension if specified
        if (extensions.length > 0 && !extensions.includes(doc.extension)) {
          continue;
        }
        
        if (!candidateScores[docPath]) {
          candidateScores[docPath] = 0;
        }
        
        // TF-IDF scoring
        const tf = count / doc.wordCount;
        candidateScores[docPath] += tf * idf;
      }
    }
    
    // Convert to array and sort by score
    const results = Object.entries(candidateScores)
      .map(([path, score]) => ({
        path,
        filename: this.index.documents[path].filename,
        score,
        preview: this.extractPreview(this.index.documents[path].content, queryTokens)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return results;
  }

  extractPreview(content, queryTokens) {
    const contentLower = content.toLowerCase();
    
    // Find first occurrence of any query token
    let bestIndex = -1;
    for (const token of queryTokens) {
      const idx = contentLower.indexOf(token);
      if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
        bestIndex = idx;
      }
    }
    
    if (bestIndex === -1) {
      // Return start of file
      const preview = content.substring(0, PREVIEW_LENGTH);
      return content.length > PREVIEW_LENGTH ? preview + '...' : preview;
    }
    
    const start = Math.max(0, bestIndex - PREVIEW_LENGTH / 2);
    const end = Math.min(content.length, bestIndex + PREVIEW_LENGTH / 2);
    
    let preview = content.substring(start, end);
    if (start > 0) preview = '...' + preview;
    if (end < content.length) preview = preview + '...';
    
    return preview.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async update() {
    let added = 0;
    let removed = 0;
    let modified = 0;
    
    for (const [docPath, doc] of Object.entries(this.index.documents)) {
      if (!fs.existsSync(docPath)) {
        this.removeDocument(docPath);
        removed++;
      } else {
        try {
          const stats = fs.statSync(docPath);
          if (stats.mtime.getTime() !== doc.modified) {
            // File changed, re-index
            const content = fs.readFileSync(docPath, 'utf8');
            const filename = path.basename(docPath);
            const ext = path.extname(docPath).toLowerCase().replace('.', '');
            
            this.removeDocument(docPath);
            this.addDocument(docPath, filename, content, stats.mtime.getTime(), ext);
            modified++;
          }
        } catch (err) {
          // Skip files we can't read
        }
      }
    }
    
    this.saveIndex();
    return { added, removed, modified };
  }

  async getStats() {
    const docCount = Object.keys(this.index.documents).length;
    const indexSize = fs.existsSync(INDEX_PATH) ? fs.statSync(INDEX_PATH).size : 0;
    
    return {
      docCount,
      indexSizeMB: indexSize / (1024 * 1024),
      lastUpdated: this.index.lastUpdated || 'Never'
    };
  }

  close() {
    this.saveIndex();
  }
}

module.exports = SearchEngine;
