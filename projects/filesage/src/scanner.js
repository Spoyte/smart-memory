const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Files to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.venv/,
  /__pycache__/,
  /\.pytest_cache/,
  /dist/,
  /build/,
  /\.next/,
  /\.nuxt/,
  /target\/debug/,
  /target\/release/,
  /vendor/,
  /\.idea/,
  /\.vscode/,
  /\.DS_Store/,
  /Thumbs\.db/,
  /\.log$/,
  /\.tmp$/,
  /\.swp$/,
  /~$/,
];

// Binary extensions to skip content extraction
const BINARY_EXTS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wav', '.flac',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.db', '.sqlite', '.sqlite3',
  '.o', '.obj', '.a', '.lib',
]);

// Max file size to read (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

// Max content length to store
const MAX_CONTENT_LENGTH = 10000;

class FileScanner {
  constructor(options = {}) {
    this.skipPatterns = options.skipPatterns || SKIP_PATTERNS;
    this.binaryExts = options.binaryExts || BINARY_EXTS;
    this.maxFileSize = options.maxFileSize || MAX_FILE_SIZE;
    this.maxContentLength = options.maxContentLength || MAX_CONTENT_LENGTH;
  }

  shouldSkip(filePath) {
    return this.skipPatterns.some(pattern => pattern.test(filePath));
  }

  isBinary(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.binaryExts.has(ext);
  }

  extractContent(filePath) {
    try {
      const stats = fs.statSync(filePath);
      
      if (stats.size > this.maxFileSize) {
        return `[File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB]`;
      }

      if (this.isBinary(filePath)) {
        return `[Binary file: ${path.extname(filePath)}]`;
      }

      let content = fs.readFileSync(filePath, 'utf-8');
      
      if (content.length > this.maxContentLength) {
        content = content.substring(0, this.maxContentLength) + '\n... [truncated]';
      }

      return content;
    } catch (err) {
      return `[Error reading: ${err.message}]`;
    }
  }

  async scan(directory, options = {}) {
    const patterns = options.patterns || ['**/*'];
    const absoluteDir = path.resolve(directory);
    
    const files = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: absoluteDir,
        absolute: true,
        dot: true,
        nodir: true,
        ignore: ['**/node_modules/**', '**/.git/**', '**/__pycache__/**', '**/dist/**', '**/build/**']
      });
      
      for (const file of matches) {
        if (this.shouldSkip(file)) continue;
        
        const relativePath = path.relative(absoluteDir, file);
        const content = this.extractContent(file);
        
        files.push({
          path: file,
          relativePath,
          content,
          isBinary: this.isBinary(file)
        });
      }
    }
    
    return files;
  }

  // Quick scan for common code files
  async scanCode(directory) {
    const codePatterns = [
      '**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx',
      '**/*.py', '**/*.rb', '**/*.go', '**/*.rs',
      '**/*.java', '**/*.c', '**/*.cpp', '**/*.h',
      '**/*.sh', '**/*.bash', '**/*.zsh',
      '**/*.md', '**/*.txt', '**/*.json', '**/*.yaml', '**/*.yml',
    ];
    return this.scan(directory, { patterns: codePatterns });
  }
}

module.exports = { FileScanner };
