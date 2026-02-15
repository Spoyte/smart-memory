#!/usr/bin/env node
/**
 * API Workbench - Terminal HTTP Client
 * A lightweight, zero-dependency HTTP client for API testing
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG_DIR = path.join(os.homedir(), '.api-workbench');
const HISTORY_FILE = path.join(CONFIG_DIR, 'history.json');
const COLLECTIONS_DIR = path.join(CONFIG_DIR, 'collections');
const ENV_FILE = path.join(CONFIG_DIR, 'env.json');

// Ensure config directory exists
function ensureConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(COLLECTIONS_DIR)) {
    fs.mkdirSync(COLLECTIONS_DIR, { recursive: true });
  }
}

// Load environment variables
function loadEnv() {
  if (fs.existsSync(ENV_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ENV_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

// Save environment variables
function saveEnv(env) {
  ensureConfig();
  fs.writeFileSync(ENV_FILE, JSON.stringify(env, null, 2));
}

// Load history
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Save to history
function saveHistory(entry) {
  ensureConfig();
  let history = loadHistory();
  history.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  });
  // Keep last 100
  history = history.slice(0, 100);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// HTTP methods with colors
const methodColors = {
  GET: colors.green,
  POST: colors.blue,
  PUT: colors.yellow,
  PATCH: colors.cyan,
  DELETE: colors.red,
  HEAD: colors.magenta,
  OPTIONS: colors.dim
};

// Status code colors
function statusColor(code) {
  if (code >= 200 && code < 300) return colors.green;
  if (code >= 300 && code < 400) return colors.yellow;
  if (code >= 400 && code < 500) return colors.red;
  if (code >= 500) return colors.magenta;
  return colors.reset;
}

// Parse arguments
function parseArgs(args) {
  const options = {
    method: 'GET',
    url: '',
    headers: {},
    body: null,
    followRedirects: true,
    timeout: 30000,
    verbose: false,
    save: null,
    collection: null
  };

  // First argument might be method or URL
  let i = 0;
  if (args.length > 0) {
    const first = args[0].toUpperCase();
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(first)) {
      options.method = first;
      i = 1;
    }
  }

  // URL
  if (i < args.length && !args[i].startsWith('-')) {
    options.url = args[i];
    i++;
  }

  // Parse flags
  for (; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '-H':
      case '--header':
        if (next) {
          const [key, ...valueParts] = next.split(':');
          if (key && valueParts.length > 0) {
            options.headers[key.trim()] = valueParts.join(':').trim();
          }
          i++;
        }
        break;
      case '-d':
      case '--data':
        if (next) {
          options.body = next;
          i++;
        }
        break;
      case '-f':
      case '--file':
        if (next && fs.existsSync(next)) {
          options.body = fs.readFileSync(next, 'utf8');
          i++;
        }
        break;
      case '-t':
      case '--timeout':
        if (next) {
          options.timeout = parseInt(next) * 1000;
          i++;
        }
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-s':
      case '--save':
        if (next) {
          options.save = next;
          i++;
        }
        break;
      case '-c':
      case '--collection':
        if (next) {
          options.collection = next;
          i++;
        }
        break;
      case '--no-follow':
        options.followRedirects = false;
        break;
      case '-h':
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

// Show help
function showHelp() {
  console.log(`
${colors.bright}API Workbench${colors.reset} - Terminal HTTP Client

${colors.bright}Usage:${colors.reset}
  apir [METHOD] <url> [options]

${colors.bright}Methods:${colors.reset}
  GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  (default: GET)

${colors.bright}Options:${colors.reset}
  -H, --header <header>    Add request header (format: "Key: Value")
  -d, --data <data>        Request body (JSON string)
  -f, --file <path>        Read request body from file
  -t, --timeout <seconds>  Request timeout (default: 30)
  -v, --verbose            Show request details
  -s, --save <name>        Save request to collection
  -c, --collection <name>  Use saved collection
  --no-follow              Don't follow redirects
  -h, --help               Show this help

${colors.bright}Examples:${colors.reset}
  apir GET https://api.example.com/users
  apir POST https://api.example.com/users -d '{"name":"John"}'
  apir GET https://api.example.com/users -H "Authorization: Bearer token"
  apir -c myapi GET /users

${colors.bright}Collections:${colors.reset}
  apir collections                    List all collections
  apir collections show <name>        Show collection details
  apir collections delete <name>      Delete collection

${colors.bright}History:${colors.reset}
  apir history                        Show recent requests
  apir history clear                  Clear history
  apir replay <n>                     Replay request #n from history

${colors.bright}Environment:${colors.reset}
  apir env                            Show environment variables
  apir env set <key> <value>          Set variable
  apir env unset <key>                Remove variable
`);
}

// Format JSON with colors
function formatJSON(json) {
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    const str = JSON.stringify(obj, null, 2);
    
    // Simple syntax highlighting
    return str
      .replace(/"([^"]+)":/g, `${colors.cyan}"$1"${colors.reset}:`)
      .replace(/: "([^"]*)"/g, `: ${colors.green}"$1"${colors.reset}`)
      .replace(/: (\d+)/g, `: ${colors.yellow}$1${colors.reset}`)
      .replace(/: (true|false|null)/g, `: ${colors.magenta}$1${colors.reset}`);
  } catch (e) {
    return json;
  }
}

// Format headers
function formatHeaders(headers) {
  return Object.entries(headers)
    .map(([key, value]) => `${colors.cyan}${key}${colors.reset}: ${value}`)
    .join('\n');
}

// Make HTTP request
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const client = url.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method,
      headers: options.headers,
      timeout: options.timeout
    };

    const startTime = Date.now();
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data,
          time: Date.now() - startTime
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Substitute environment variables in URL and headers
function substituteEnv(options, env) {
  let url = options.url;
  let headers = { ...options.headers };
  let body = options.body;

  // Replace {{variable}} or $variable patterns
  const replaceVars = (str) => {
    if (!str) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return env[key] || match;
    }).replace(/\$\{(\w+)\}/g, (match, key) => {
      return env[key] || match;
    });
  };

  url = replaceVars(url);
  
  for (const [key, value] of Object.entries(headers)) {
    headers[key] = replaceVars(value);
  }

  if (body) {
    body = replaceVars(body);
  }

  return { ...options, url, headers, body };
}

// Load collection
function loadCollection(name) {
  const file = path.join(COLLECTIONS_DIR, `${name}.json`);
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Save collection
function saveCollection(name, data) {
  ensureConfig();
  const file = path.join(COLLECTIONS_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// List collections
function listCollections() {
  ensureConfig();
  if (!fs.existsSync(COLLECTIONS_DIR)) {
    console.log('No collections found.');
    return;
  }
  
  const files = fs.readdirSync(COLLECTIONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  
  if (files.length === 0) {
    console.log('No collections found.');
    return;
  }

  console.log(`${colors.bright}Collections:${colors.reset}`);
  files.forEach(name => {
    const coll = loadCollection(name);
    const count = coll?.requests?.length || 0;
    console.log(`  ${colors.cyan}${name}${colors.reset} (${count} requests)`);
  });
}

// Show history
function showHistory() {
  const history = loadHistory();
  if (history.length === 0) {
    console.log('No history found.');
    return;
  }

  console.log(`${colors.bright}Recent Requests:${colors.reset}\n`);
  history.slice(0, 20).forEach((entry, i) => {
    const methodColor = methodColors[entry.method] || colors.reset;
    const status = entry.responseStatus ? `${statusColor(entry.responseStatus)}${entry.responseStatus}${colors.reset}` : '---';
    const time = entry.time ? `${entry.time}ms` : '';
    console.log(`  ${colors.dim}[${i + 1}]${colors.reset} ${methodColor}${entry.method.padEnd(6)}${colors.reset} ${entry.url.substring(0, 60)} ${status} ${colors.dim}${time}${colors.reset}`);
  });
}

// Replay from history
async function replayFromHistory(index) {
  const history = loadHistory();
  if (index < 1 || index > history.length) {
    console.error(`${colors.red}Error: Invalid history index${colors.reset}`);
    return;
  }

  const entry = history[index - 1];
  console.log(`${colors.dim}Replaying request #${index}...${colors.reset}\n`);
  
  await executeRequest({
    method: entry.method,
    url: entry.url,
    headers: entry.headers || {},
    body: entry.body,
    verbose: true
  });
}

// Execute request
async function executeRequest(options) {
  // Load environment and substitute
  const env = loadEnv();
  options = substituteEnv(options, env);

  // Add default headers
  if (!options.headers['User-Agent']) {
    options.headers['User-Agent'] = 'API-Workbench/1.0';
  }
  if (options.body && !options.headers['Content-Type']) {
    try {
      JSON.parse(options.body);
      options.headers['Content-Type'] = 'application/json';
    } catch (e) {
      // Not JSON, don't set content-type
    }
  }

  // Show request if verbose
  if (options.verbose) {
    const methodColor = methodColors[options.method] || colors.reset;
    console.log(`${colors.dim}>${colors.reset} ${methodColor}${options.method}${colors.reset} ${options.url}`);
    console.log(`${colors.dim}>${colors.reset} ${formatHeaders(options.headers).replace(/\n/g, `\n${colors.dim}>${colors.reset} `)}`);
    if (options.body) {
      console.log(`${colors.dim}>${colors.reset}`);
      console.log(`${colors.dim}>${colors.reset} ${options.body.substring(0, 500)}${options.body.length > 500 ? '...' : ''}`);
    }
    console.log();
  }

  try {
    const response = await makeRequest(options);

    // Save to history
    saveHistory({
      method: options.method,
      url: options.url,
      headers: options.headers,
      body: options.body,
      responseStatus: response.status,
      time: response.time
    });

    // Save to collection if requested
    if (options.save) {
      let collection = loadCollection(options.save) || { name: options.save, requests: [] };
      collection.requests.push({
        method: options.method,
        url: options.url,
        headers: options.headers,
        body: options.body,
        savedAt: new Date().toISOString()
      });
      saveCollection(options.save, collection);
      console.log(`${colors.dim}Saved to collection: ${options.save}${colors.reset}\n`);
    }

    // Print response
    const status = `${statusColor(response.status)}${response.status} ${response.statusMessage}${colors.reset}`;
    console.log(`${colors.dim}<${colors.reset} ${status} ${colors.dim}(${response.time}ms)${colors.reset}`);
    
    // Print response headers if verbose
    if (options.verbose) {
      const resHeaders = Object.entries(response.headers)
        .map(([k, v]) => `${colors.cyan}${k}${colors.reset}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
      console.log(`${colors.dim}<${colors.reset} ${resHeaders.replace(/\n/g, `\n${colors.dim}<${colors.reset} `)}`);
    }

    console.log();

    // Print body
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      console.log(formatJSON(response.body));
    } else {
      console.log(response.body);
    }

  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Handle collection commands
function handleCollectionCommand(args) {
  const subcommand = args[0];
  
  switch (subcommand) {
    case undefined:
    case 'list':
      listCollections();
      break;
    case 'show':
      if (args[1]) {
        const coll = loadCollection(args[1]);
        if (coll) {
          console.log(`${colors.bright}Collection: ${args[1]}${colors.reset}\n`);
          coll.requests?.forEach((req, i) => {
            const methodColor = methodColors[req.method] || colors.reset;
            console.log(`  ${colors.dim}[${i + 1}]${colors.reset} ${methodColor}${req.method}${colors.reset} ${req.url}`);
          });
        } else {
          console.log(`Collection not found: ${args[1]}`);
        }
      }
      break;
    case 'delete':
      if (args[1]) {
        const file = path.join(COLLECTIONS_DIR, `${args[1]}.json`);
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`Deleted collection: ${args[1]}`);
        } else {
          console.log(`Collection not found: ${args[1]}`);
        }
      }
      break;
    default:
      console.log(`Unknown command: collections ${subcommand}`);
  }
}

// Handle env commands
function handleEnvCommand(args) {
  const subcommand = args[0];
  const env = loadEnv();
  
  switch (subcommand) {
    case undefined:
    case 'list':
      console.log(`${colors.bright}Environment Variables:${colors.reset}\n`);
      if (Object.keys(env).length === 0) {
        console.log('  No variables set.');
      } else {
        for (const [key, value] of Object.entries(env)) {
          console.log(`  ${colors.cyan}${key}${colors.reset}=${value}`);
        }
      }
      break;
    case 'set':
      if (args[1] && args[2]) {
        env[args[1]] = args[2];
        saveEnv(env);
        console.log(`Set ${args[1]}=${args[2]}`);
      }
      break;
    case 'unset':
      if (args[1]) {
        delete env[args[1]];
        saveEnv(env);
        console.log(`Unset ${args[1]}`);
      }
      break;
    default:
      console.log(`Unknown command: env ${subcommand}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  // Handle special commands
  const command = args[0];
  
  if (command === 'collections') {
    handleCollectionCommand(args.slice(1));
    return;
  }
  
  if (command === 'history') {
    if (args[1] === 'clear') {
      ensureConfig();
      if (fs.existsSync(HISTORY_FILE)) {
        fs.unlinkSync(HISTORY_FILE);
      }
      console.log('History cleared.');
    } else {
      showHistory();
    }
    return;
  }
  
  if (command === 'replay') {
    if (args[1]) {
      await replayFromHistory(parseInt(args[1]));
    } else {
      console.log('Usage: apir replay <number>');
    }
    return;
  }
  
  if (command === 'env') {
    handleEnvCommand(args.slice(1));
    return;
  }

  // Regular request
  const options = parseArgs(args);
  
  if (!options.url) {
    console.error(`${colors.red}Error: URL required${colors.reset}`);
    showHelp();
    process.exit(1);
  }

  await executeRequest(options);
}

main();
