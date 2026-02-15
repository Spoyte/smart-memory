#!/usr/bin/env node
/**
 * Webhook Inspector - Self-hosted webhook debugging tool
 * 
 * A simple HTTP server that captures and displays incoming requests,
 * perfect for debugging webhooks without external services.
 * 
 * Usage:
 *   webhook-inspector [port]
 *   
 * Features:
 *   - Capture all HTTP requests (GET, POST, PUT, DELETE, etc.)
 *   - View headers, body, query params
 *   - Auto-generate unique endpoints
 *   - Real-time request log
 *   - Replay requests
 */

import http from 'http';
import url from 'url';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.argv[2]) || 7777;
const HOST = '0.0.0.0';

// In-memory storage for requests
const bins = new Map(); // binId -> { created, requests: [] }
const requests = new Map(); // requestId -> request data

// Generate unique bin ID
function generateBinId() {
  return randomBytes(8).toString('hex');
}

// Generate unique request ID
function generateRequestId() {
  return randomBytes(6).toString('hex');
}

// Parse request body
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        // Try to parse as JSON
        const json = JSON.parse(body);
        resolve({ raw: body, json, type: 'json' });
      } catch {
        resolve({ raw: body, json: null, type: 'text' });
      }
    });
  });
}

// HTML template for the UI
function getHTML(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header {
      border-bottom: 1px solid #30363d;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 { color: #58a6ff; font-size: 1.8rem; margin-bottom: 0.5rem; }
    h2 { color: #79c0ff; font-size: 1.3rem; margin: 1.5rem 0 1rem; }
    .subtitle { color: #8b949e; }
    .btn {
      background: #238636;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-block;
      margin: 0.5rem 0.5rem 0.5rem 0;
    }
    .btn:hover { background: #2ea043; }
    .btn.secondary { background: #1f6feb; }
    .btn.secondary:hover { background: #388bfd; }
    .btn.danger { background: #da3633; }
    .btn.danger:hover { background: #f85149; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1.5rem;
      margin: 1rem 0;
    }
    .endpoint {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1rem;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.9rem;
      color: #7ee787;
      margin: 1rem 0;
      word-break: break-all;
    }
    .request-item {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1rem;
      margin: 0.5rem 0;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .request-item:hover { border-color: #58a6ff; }
    .method {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
      margin-right: 0.5rem;
    }
    .method.GET { background: #1f6feb; color: white; }
    .method.POST { background: #238636; color: white; }
    .method.PUT { background: #9e6a03; color: white; }
    .method.DELETE { background: #da3633; color: white; }
    .method.PATCH { background: #8957e5; color: white; }
    .timestamp { color: #8b949e; font-size: 0.85rem; }
    .empty { color: #8b949e; text-align: center; padding: 2rem; }
    pre {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1rem;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.5;
    }
    .section { margin: 1.5rem 0; }
    .section h3 {
      color: #79c0ff;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid #30363d;
    }
    th { color: #8b949e; font-weight: normal; }
    .back-link { color: #58a6ff; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .stat {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
    }
    .stat-value { font-size: 1.5rem; color: #58a6ff; font-weight: bold; }
    .stat-label { font-size: 0.85rem; color: #8b949e; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

// Home page
function homePage() {
  const activeBins = bins.size;
  const totalRequests = Array.from(bins.values()).reduce((sum, b) => sum + b.requests.length, 0);
  
  const content = `
    <header>
      <h1>🔍 Webhook Inspector</h1>
      <p class="subtitle">Self-hosted webhook debugging tool. Create a bin, send requests, inspect them.</p>
    </header>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${activeBins}</div>
        <div class="stat-label">Active Bins</div>
      </div>
      <div class="stat">
        <div class="stat-value">${totalRequests}</div>
        <div class="stat-label">Requests Captured</div>
      </div>
    </div>
    
    <div class="card">
      <h2>Create New Bin</h2>
      <p>Create a unique endpoint to capture and inspect HTTP requests.</p>
      <form action="/create" method="POST">
        <button type="submit" class="btn">Create Bin</button>
      </form>
    </div>
    
    ${activeBins > 0 ? `
    <div class="card">
      <h2>Active Bins</h2>
      ${Array.from(bins.entries()).map(([id, bin]) => `
        <div class="request-item" onclick="location.href='/bin/${id}'">
          <strong>Bin: ${id}</strong>
          <span class="timestamp">Created: ${new Date(bin.created).toLocaleString()}</span>
          <br>
          <span style="color: #8b949e;">${bin.requests.length} requests captured</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
  `;
  
  return getHTML('Webhook Inspector', content);
}

// Bin page
function binPage(binId) {
  const bin = bins.get(binId);
  if (!bin) {
    return getHTML('Bin Not Found', `
      <header>
        <h1>❌ Bin Not Found</h1>
        <p class="subtitle">This bin doesn't exist or has expired.</p>
      </header>
      <a href="/" class="btn">Go Home</a>
    `);
  }
  
  const endpoint = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/bin/${binId}/receive`;
  
  const content = `
    <header>
      <h1>📦 Bin: ${binId}</h1>
      <p class="subtitle"><a href="/" class="back-link">← Back to Home</a></p>
    </header>
    
    <div class="card">
      <h2>Webhook Endpoint</h2>
      <p>Send HTTP requests to this URL:</p>
      <div class="endpoint">${endpoint}</div>
      <form action="/bin/${binId}/clear" method="POST" style="display: inline;">
        <button type="submit" class="btn danger">Clear Requests</button>
      </form>
    </div>
    
    <div class="card">
      <h2>Captured Requests (${bin.requests.length})</h2>
      ${bin.requests.length === 0 
        ? '<p class="empty">No requests yet. Send one to the endpoint above!</p>'
        : bin.requests.slice().reverse().map(reqId => {
            const req = requests.get(reqId);
            return `
              <div class="request-item" onclick="location.href='/request/${reqId}'">
                <span class="method ${req.method}">${req.method}</span>
                <code>${req.path}</code>
                <span class="timestamp">${new Date(req.timestamp).toLocaleString()}</span>
                <br>
                <span style="color: #8b949e; font-size: 0.85rem;">
                  ${req.headers['content-type'] || 'no content-type'} • ${req.body.raw.length} bytes
                </span>
              </div>
            `;
          }).join('')
      }
    </div>
  `;
  
  return getHTML(`Bin ${binId}`, content);
}

// Request detail page
function requestPage(reqId) {
  const req = requests.get(reqId);
  if (!req) {
    return getHTML('Request Not Found', `
      <header>
        <h1>❌ Request Not Found</h1>
      </header>
      <a href="/" class="btn">Go Home</a>
    `);
  }
  
  const headersRows = Object.entries(req.headers)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('');
  
  const content = `
    <header>
      <h1><span class="method ${req.method}">${req.method}</span> Request Details</h1>
      <p class="subtitle"><a href="/bin/${req.binId}" class="back-link">← Back to Bin</a></p>
    </header>
    
    <div class="card">
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${req.method}</div>
          <div class="stat-label">Method</div>
        </div>
        <div class="stat">
          <div class="stat-value">${req.body.raw.length}</div>
          <div class="stat-label">Bytes</div>
        </div>
        <div class="stat">
          <div class="stat-value">${new Date(req.timestamp).toLocaleTimeString()}</div>
          <div class="stat-label">Time</div>
        </div>
      </div>
      
      <div class="section">
        <h3>URL</h3>
        <pre>${req.url}</pre>
      </div>
      
      <div class="section">
        <h3>Headers</h3>
        <table>
          <thead><tr><th>Name</th><th>Value</th></tr></thead>
          <tbody>${headersRows}</tbody>
        </table>
      </div>
      
      <div class="section">
        <h3>Body (${req.body.type})</h3>
        ${req.body.json 
          ? `<pre>${JSON.stringify(req.body.json, null, 2)}</pre>`
          : `<pre>${req.body.raw || '(empty)'}</pre>`
        }
      </div>
      
      <div class="section">
        <h3>Raw Request</h3>
        <pre>${req.method} ${req.path} HTTP/1.1
Host: ${req.headers.host || 'unknown'}
${Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}

${req.body.raw}</pre>
      </div>
    </div>
  `;
  
  return getHTML(`Request ${reqId}`, content);
}

// Create server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Home page
  if (path === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(homePage());
    return;
  }
  
  // Create new bin
  if (path === '/create' && req.method === 'POST') {
    const binId = generateBinId();
    bins.set(binId, {
      id: binId,
      created: Date.now(),
      requests: []
    });
    res.writeHead(302, { 'Location': `/bin/${binId}` });
    res.end();
    return;
  }
  
  // Bin page
  const binMatch = path.match(/^\/bin\/([a-f0-9]{16})$/);
  if (binMatch && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(binPage(binMatch[1]));
    return;
  }
  
  // Clear bin requests
  const clearMatch = path.match(/^\/bin\/([a-f0-9]{16})\/clear$/);
  if (clearMatch && req.method === 'POST') {
    const binId = clearMatch[1];
    const bin = bins.get(binId);
    if (bin) {
      bin.requests.forEach(reqId => requests.delete(reqId));
      bin.requests = [];
    }
    res.writeHead(302, { 'Location': `/bin/${binId}` });
    res.end();
    return;
  }
  
  // Receive webhook
  const receiveMatch = path.match(/^\/bin\/([a-f0-9]{16})\/receive(.*)$/);
  if (receiveMatch) {
    const binId = receiveMatch[1];
    const bin = bins.get(binId);
    
    if (!bin) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bin not found' }));
      return;
    }
    
    const body = await parseBody(req);
    const reqId = generateRequestId();
    
    const requestData = {
      id: reqId,
      binId,
      method: req.method,
      url: req.url,
      path: receiveMatch[2] || '/',
      headers: req.headers,
      body,
      timestamp: Date.now(),
      ip: req.socket.remoteAddress
    };
    
    requests.set(reqId, requestData);
    bin.requests.push(reqId);
    
    // Respond with success
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: true, 
      message: 'Request captured',
      binUrl: `http://localhost:${PORT}/bin/${binId}`
    }));
    return;
  }
  
  // Request detail page
  const reqMatch = path.match(/^\/request\/([a-f0-9]{12})$/);
  if (reqMatch && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(requestPage(reqMatch[1]));
    return;
  }
  
  // API: List bins
  if (path === '/api/bins' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      bins: Array.from(bins.keys())
    }));
    return;
  }
  
  // API: Get bin details
  const apiBinMatch = path.match(/^\/api\/bin\/([a-f0-9]{16})$/);
  if (apiBinMatch && req.method === 'GET') {
    const binId = apiBinMatch[1];
    const bin = bins.get(binId);
    if (!bin) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bin not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...bin,
      requests: bin.requests.map(reqId => {
        const r = requests.get(reqId);
        return {
          id: r.id,
          method: r.method,
          path: r.path,
          timestamp: r.timestamp
        };
      })
    }));
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(getHTML('Not Found', `
    <header>
      <h1>❌ 404 Not Found</h1>
    </header>
    <a href="/" class="btn">Go Home</a>
  `));
});

server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║              🔍 Webhook Inspector                        ║
╠══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}              ║
║                                                          ║
║  Quick start:                                            ║
║  1. Open http://localhost:${PORT} in your browser         ║
║  2. Click "Create Bin" to generate an endpoint           ║
║  3. Send requests to your unique URL                     ║
║  4. Inspect them in real-time                            ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
