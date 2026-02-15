#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const QR_CODE_SIZE = 2; // QR code size multiplier

// MIME types for common files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

// Simple QR code generator using Unicode blocks
function generateQR(text) {
  // For a real implementation, we'd use a library like qrcode
  // For this minimal version, we'll generate a simple representation
  // and also provide a URL that can be opened
  return {
    text: text,
    ascii: generateSimpleQR(text)
  };
}

function generateSimpleQR(text) {
  // Create a compact representation
  const lines = [
    '╔═══════════════╗',
    '║  📱 SCAN ME   ║',
    '╠═══════════════╣',
  ];
  
  // Add URL in chunks
  const maxLine = 13;
  for (let i = 0; i < text.length; i += maxLine) {
    const chunk = text.slice(i, i + maxLine);
    const padded = chunk.padEnd(maxLine, ' ');
    lines.push(`║ ${padded} ║`);
  }
  
  lines.push('╚═══════════════╝');
  return lines.join('\n');
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function generateFileListHtml(files, currentPath, uploadEnabled) {
  const parentPath = path.dirname(currentPath);
  const showParent = currentPath !== '.';
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickServe - ${currentPath}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { color: #58a6ff; margin-bottom: 20px; font-size: 24px; }
    .path { color: #8b949e; margin-bottom: 20px; font-family: monospace; }
    .file-list { list-style: none; }
    .file-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 4px;
      transition: background 0.2s;
    }
    .file-item:hover { background: #21262d; }
    .file-item a {
      color: #c9d1d9;
      text-decoration: none;
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .file-item a:hover { color: #58a6ff; }
    .icon { font-size: 20px; width: 24px; text-align: center; }
    .size { color: #8b949e; font-size: 12px; margin-left: auto; }
    .upload-area {
      border: 2px dashed #30363d;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      margin-top: 30px;
      transition: border-color 0.2s;
    }
    .upload-area.dragover { border-color: #58a6ff; background: #161b22; }
    .upload-area h3 { margin-bottom: 10px; color: #8b949e; }
    .upload-btn {
      background: #238636;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .upload-btn:hover { background: #2ea043; }
    #fileInput { display: none; }
    .qr-section {
      background: #161b22;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      text-align: center;
    }
    .qr-code {
      background: white;
      padding: 20px;
      border-radius: 8px;
      display: inline-block;
      margin: 10px 0;
    }
    .url-display {
      font-family: monospace;
      background: #0d1117;
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
      word-break: break-all;
    }
    .info {
      background: #21262d;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .info code {
      background: #0d1117;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <h1>📁 QuickServe</h1>
  
  <div class="qr-section">
    <p>Scan to open on your phone</p>
    <div class="qr-code">
      <canvas id="qrCanvas"></canvas>
    </div>
    <div class="url-display" id="currentUrl"></div>
  </div>

  <div class="info">
    <strong>Current path:</strong> <code>${currentPath}</code><br>
    <strong>Files:</strong> ${files.length}
  </div>

  <ul class="file-list">`;

  if (showParent) {
    html += `
    <li class="file-item">
      <a href="${parentPath === '.' ? '/' : '/' + encodeURIComponent(parentPath)}">
        <span class="icon">⬆️</span>
        <span>..</span>
      </a>
    </li>`;
  }

  // Sort: directories first, then files
  const sorted = files.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });

  for (const file of sorted) {
    const icon = file.isDirectory ? '📁' : getFileIcon(file.name);
    const href = file.isDirectory 
      ? '/' + encodeURIComponent(path.join(currentPath, file.name))
      : '/' + encodeURIComponent(path.join(currentPath, file.name));
    const size = file.isDirectory ? '' : formatSize(file.size);
    
    html += `
    <li class="file-item">
      <a href="${href}">
        <span class="icon">${icon}</span>
        <span>${file.name}</span>
      </a>
      <span class="size">${size}</span>
    </li>`;
  }

  html += `
  </ul>`;

  if (uploadEnabled) {
    html += `
  <div class="upload-area" id="uploadArea">
    <h3>📤 Drop files here to upload</h3>
    <p>or</p>
    <button class="upload-btn" onclick="document.getElementById('fileInput').click()">Choose Files</button>
    <input type="file" id="fileInput" multiple onchange="handleFiles(this.files)">
    <div id="uploadStatus"></div>
  </div>`;
  }

  html += `
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>
    const currentUrl = window.location.href;
    document.getElementById('currentUrl').textContent = currentUrl;
    
    // Generate QR code
    new QRCode(document.getElementById('qrCanvas'), {
      text: currentUrl,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff'
    });

    // Drag and drop
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });
      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
      });
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
      });
    }

    function handleFiles(files) {
      const status = document.getElementById('uploadStatus');
      status.innerHTML = '<p>Uploading...</p>';
      
      let completed = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/upload', {
          method: 'POST',
          body: formData
        })
        .then(() => {
          completed++;
          if (completed === files.length) {
            status.innerHTML = '<p style="color: #3fb950;">✓ Upload complete!</p>';
            setTimeout(() => location.reload(), 1000);
          }
        })
        .catch(err => {
          status.innerHTML = '<p style="color: #f85149;">✗ Upload failed: ' + err.message + '</p>';
        });
      }
    }
  </script>
</body>
</html>`;

  return html;
}

function getFileIcon(filename) {
  const ext = path.extname(filename).toLowerCase();
  const icons = {
    '.html': '🌐', '.css': '🎨', '.js': '⚡', '.json': '📋',
    '.png': '🖼️', '.jpg': '🖼️', '.jpeg': '🖼️', '.gif': '🖼️', '.svg': '🖼️',
    '.pdf': '📄', '.txt': '📝', '.md': '📝',
    '.zip': '📦', '.tar': '📦', '.gz': '📦',
    '.mp4': '🎬', '.mp3': '🎵', '.wav': '🎵',
    '.doc': '📘', '.docx': '📘', '.xls': '📊', '.xlsx': '📊',
    '.ppt': '📽️', '.pptx': '📽️'
  };
  return icons[ext] || '📄';
}

class QuickServe {
  constructor(options = {}) {
    this.port = options.port || 0; // 0 = random available port
    this.rootDir = path.resolve(options.rootDir || '.');
    this.uploadEnabled = options.upload !== false;
    this.autoShutdown = options.autoShutdown || 0; // minutes, 0 = disabled
    this.lastActivity = Date.now();
    this.server = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      
      this.server.listen(this.port, () => {
        const addr = this.server.address();
        this.port = addr.port;
        resolve(this.port);
      });

      this.server.on('error', reject);

      // Auto-shutdown timer
      if (this.autoShutdown > 0) {
        setInterval(() => this.checkShutdown(), 60000); // Check every minute
      }
    });
  }

  checkShutdown() {
    const idleMinutes = (Date.now() - this.lastActivity) / 60000;
    if (idleMinutes >= this.autoShutdown) {
      console.log(`\n💤 No activity for ${this.autoShutdown} minutes. Shutting down...`);
      this.stop();
      process.exit(0);
    }
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  async handleRequest(req, res) {
    this.lastActivity = Date.now();

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${this.port}`);
    const pathname = decodeURIComponent(url.pathname);

    // Handle upload
    if (pathname === '/upload' && req.method === 'POST' && this.uploadEnabled) {
      await this.handleUpload(req, res);
      return;
    }

    // Serve file or directory
    const filePath = path.join(this.rootDir, pathname === '/' ? '.' : pathname);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(this.rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    try {
      const stat = await fs.promises.stat(filePath);

      if (stat.isDirectory()) {
        await this.serveDirectory(filePath, pathname, res);
      } else {
        await this.serveFile(filePath, res);
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    }
  }

  async serveDirectory(dirPath, urlPath, res) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      size: entry.isDirectory() ? 0 : fs.statSync(path.join(dirPath, entry.name)).size
    }));

    const html = generateFileListHtml(files, urlPath === '/' ? '.' : urlPath.slice(1), this.uploadEnabled);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    res.end(html);
  }

  async serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', (await fs.promises.stat(filePath)).size);
    
    const stream = fs.createReadStream(filePath);
    res.writeHead(200);
    stream.pipe(res);
  }

  async handleUpload(req, res) {
    return new Promise((resolve) => {
      const chunks = [];
      
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        
        // Parse multipart form data (simplified)
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
          res.writeHead(400);
          res.end('Bad request');
          resolve();
          return;
        }

        // Extract filename and file data
        const data = buffer.toString('binary');
        const filenameMatch = data.match(/filename="([^"]+)"/);
        
        if (filenameMatch) {
          const filename = filenameMatch[1];
          const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filepath = path.join(this.rootDir, safeFilename);
          
          // Find the actual file content
          const headerEnd = data.indexOf('\r\n\r\n');
          const footerStart = data.lastIndexOf('--' + boundary);
          
          if (headerEnd > 0 && footerStart > 0) {
            const fileData = buffer.slice(headerEnd + 4, footerStart - 2);
            await fs.promises.writeFile(filepath, fileData);
          }
        }
        
        res.writeHead(200);
        res.end('OK');
        resolve();
      });
    });
  }
}

module.exports = { QuickServe, getLocalIP, generateQR };
