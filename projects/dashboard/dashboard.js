#!/usr/bin/env node
/**
 * Daily Dashboard CLI
 * A morning briefing tool for the terminal
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  weatherCity: process.env.DASHBOARD_CITY || 'Shanghai',
  gitScanDepth: 3,
  newsEnabled: false, // Set to true and add API key for news
};

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function printHeader(text) {
  console.log(`\n${C.bright}${C.cyan}━━ ${text} ${'━'.repeat(50 - text.length)}${C.reset}`);
}

function printSection(title, content) {
  if (!content || content.trim() === '') return;
  console.log(`\n${C.bright}${C.yellow}▸ ${title}${C.reset}`);
  console.log(content);
}

// Weather via wttr.in (no API key needed)
async function getWeather() {
  return new Promise((resolve) => {
    const url = `https://wttr.in/${encodeURIComponent(CONFIG.weatherCity)}?format=%l:+%c+%t,+%w,+%h`;
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const clean = data.trim().replace(/\n/g, ' ');
        resolve(clean || `${C.gray}Weather data unavailable${C.reset}`);
      });
    });
    req.on('error', () => resolve(`${C.gray}Weather unavailable (check connection)${C.reset}`));
    req.on('timeout', () => {
      req.destroy();
      resolve(`${C.gray}Weather timeout (wttr.in may be slow)${C.reset}`);
    });
    req.setTimeout(5000);
  });
}

// System info
function getSystemInfo() {
  const uptime = os.uptime();
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  
  const loadAvg = os.loadavg()[0].toFixed(2);
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
  const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
  const usedMem = (totalMem - freeMem).toFixed(1);
  const memPercent = Math.round((usedMem / totalMem) * 100);
  const memColor = memPercent > 80 ? C.red : memPercent > 60 ? C.yellow : C.green;
  
  // Disk usage (Linux/macOS)
  let diskInfo = '';
  try {
    const df = execSync('df -h / | tail -1', { encoding: 'utf8', timeout: 1000 }).trim();
    const parts = df.split(/\s+/);
    const used = parts[2];
    const avail = parts[3];
    const percent = parts[4];
    diskInfo = `  ${C.green}●${C.reset} Disk: ${used} used, ${avail} free (${percent})`;
  } catch (e) {
    diskInfo = '';
  }
  
  return [
    `  ${C.green}●${C.reset} Uptime: ${hours}h ${mins}m`,
    `  ${C.green}●${C.reset} Load: ${loadAvg}`,
    `  ${C.green}●${C.reset} Memory: ${usedMem}GB / ${totalMem}GB (${memColor}${memPercent}%${C.reset})`,
    diskInfo,
  ].filter(Boolean).join('\n');
}

// Git repository scanner
function scanGitRepos(basePath, depth = 0) {
  if (depth > CONFIG.gitScanDepth) return [];
  
  const repos = [];
  try {
    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(basePath, entry.name);
      const gitPath = path.join(fullPath, '.git');
      
      if (fs.existsSync(gitPath)) {
        try {
          const status = execSync('git status --porcelain', { 
            cwd: fullPath, 
            encoding: 'utf8',
            timeout: 2000 
          });
          const branch = execSync('git branch --show-current', {
            cwd: fullPath,
            encoding: 'utf8',
            timeout: 1000
          }).trim();
          
          const changes = status.trim().split('\n').filter(l => l.trim()).length;
          repos.push({
            name: entry.name,
            path: fullPath,
            branch,
            changes,
            clean: changes === 0
          });
        } catch (e) {
          // Skip repos with errors
        }
      } else {
        // Recurse into subdirectories
        repos.push(...scanGitRepos(fullPath, depth + 1));
      }
    }
  } catch (e) {
    // Directory not accessible
  }
  return repos;
}

function formatGitRepos(repos) {
  if (repos.length === 0) return `${C.gray}No git repositories found${C.reset}`;
  
  return repos.map(r => {
    const status = r.clean 
      ? `${C.green}✓${C.reset}` 
      : `${C.yellow}${r.changes} changes${C.reset}`;
    return `  ${status} ${C.bright}${r.name}${C.reset} (${C.gray}${r.branch}${C.reset})`;
  }).join('\n');
}

// Date/time formatting
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// Main dashboard
async function main() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Header
  console.log(`\n${C.bright}${C.cyan}╔${'═'.repeat(58)}╗${C.reset}`);
  console.log(`${C.bright}${C.cyan}║${C.reset}  ${getGreeting()}!${' '.repeat(45)}${C.bright}${C.cyan}║${C.reset}`);
  console.log(`${C.bright}${C.cyan}║${C.reset}  ${C.gray}${dateStr}${C.reset}${' '.repeat(58 - dateStr.length - 2)}${C.bright}${C.cyan}║${C.reset}`);
  console.log(`${C.bright}${C.cyan}║${C.reset}  ${C.gray}${timeStr}${C.reset}${' '.repeat(58 - timeStr.length - 2)}${C.bright}${C.cyan}║${C.reset}`);
  console.log(`${C.bright}${C.cyan}╚${'═'.repeat(58)}╝${C.reset}`);
  
  // Weather
  printHeader('WEATHER');
  const weather = await getWeather();
  console.log(`  ${weather}`);
  
  // System
  printHeader('SYSTEM');
  console.log(getSystemInfo());
  
  // Git repos
  printHeader('REPOSITORIES');
  const workspacePath = path.resolve(os.homedir(), '.openclaw/workspace');
  const repos = scanGitRepos(workspacePath);
  console.log(formatGitRepos(repos));
  
  // Quick actions reminder
  printHeader('QUICK ACTIONS');
  console.log(`  ${C.gray}Run: dashboard --help for options${C.reset}`);
  console.log(`  ${C.gray}Env: DASHBOARD_CITY=Beijing to change location${C.reset}`);
  
  console.log(`\n${C.dim}${'─'.repeat(60)}${C.reset}\n`);
}

main().catch(console.error);
