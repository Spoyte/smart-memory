#!/usr/bin/env node

/**
 * devsnap - Development Environment Snapshot & Restore
 * 
 * Captures your complete dev environment and lets you restore it anywhere.
 * Like Time Machine for your development setup.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const SNAP_DIR = path.join(os.homedir(), '.devsnap');
const CONFIG_FILE = path.join(SNAP_DIR, 'config.json');

// Ensure snap directory exists
if (!fs.existsSync(SNAP_DIR)) {
  fs.mkdirSync(SNAP_DIR, { recursive: true });
}

// Default configuration
const DEFAULT_CONFIG = {
  version: '1.0.0',
  trackedFiles: [
    '~/.bashrc',
    '~/.zshrc',
    '~/.vimrc',
    '~/.gitconfig',
    '~/.ssh/config',
    '~/.npmrc',
    '~/.config/git/ignore',
  ],
  trackedDirs: [
    '~/.config/nvim',
    '~/.config/vscode',
    '~/.config/fish',
  ],
  envVars: [
    'EDITOR',
    'SHELL',
    'NODE_OPTIONS',
    'GOPATH',
    'RUSTUP_HOME',
    'CARGO_HOME',
  ],
  packageManagers: ['npm', 'pip', 'cargo', 'brew', 'apt'],
};

function getConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function expandPath(p) {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    shell: process.env.SHELL || 'unknown',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  };
}

function getInstalledPackages() {
  const packages = {};
  
  // npm global packages
  try {
    const npmList = execSync('npm list -g --depth=0 --json 2>/dev/null || echo "{}"', { encoding: 'utf8' });
    const npmData = JSON.parse(npmList);
    packages.npm = Object.keys(npmData.dependencies || {}).map(name => ({
      name,
      version: npmData.dependencies[name].version,
    }));
  } catch (e) {
    packages.npm = [];
  }
  
  // pip packages
  try {
    const pipList = execSync('pip list --format=json 2>/dev/null || echo "[]"', { encoding: 'utf8' });
    packages.pip = JSON.parse(pipList);
  } catch (e) {
    packages.pip = [];
  }
  
  // cargo packages
  try {
    const cargoList = execSync('cargo install --list 2>/dev/null || echo ""', { encoding: 'utf8' });
    packages.cargo = cargoList
      .split('\n')
      .filter(line => line.includes(' v') && !line.startsWith(' '))
      .map(line => {
        const match = line.match(/^(\S+) v(\S+)/);
        return match ? { name: match[1], version: match[2] } : null;
      })
      .filter(Boolean);
  } catch (e) {
    packages.cargo = [];
  }
  
  // Homebrew packages (macOS/Linux)
  try {
    const brewList = execSync('brew list --formula 2>/dev/null || echo ""', { encoding: 'utf8' });
    packages.brew = brewList.split('\n').filter(Boolean);
  } catch (e) {
    packages.brew = [];
  }
  
  // apt packages (Debian/Ubuntu)
  try {
    const aptList = execSync('apt list --installed 2>/dev/null | grep -v "Listing" | head -100 || echo ""', { encoding: 'utf8' });
    packages.apt = aptList.split('\n').filter(Boolean).map(line => line.split('/')[0]).filter(Boolean);
  } catch (e) {
    packages.apt = [];
  }
  
  return packages;
}

function getEnvVars(config) {
  const env = {};
  for (const key of config.envVars) {
    if (process.env[key]) {
      env[key] = process.env[key];
    }
  }
  return env;
}

function backupFiles(config) {
  const files = {};
  
  for (const file of config.trackedFiles) {
    const expanded = expandPath(file);
    if (fs.existsSync(expanded)) {
      try {
        const content = fs.readFileSync(expanded, 'utf8');
        files[file] = content;
      } catch (e) {
        files[file] = { error: e.message };
      }
    }
  }
  
  return files;
}

function backupDirs(config) {
  const dirs = {};
  
  for (const dir of config.trackedDirs) {
    const expanded = expandPath(dir);
    if (fs.existsSync(expanded)) {
      dirs[dir] = {};
      const files = fs.readdirSync(expanded, { recursive: true });
      for (const file of files) {
        const fullPath = path.join(expanded, file);
        if (fs.statSync(fullPath).isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            dirs[dir][file] = content;
          } catch (e) {
            dirs[dir][file] = { error: 'binary or unreadable' };
          }
        }
      }
    }
  }
  
  return dirs;
}

function getGitConfigs() {
  const configs = {};
  try {
    configs.global = execSync('git config --global --list 2>/dev/null || echo ""', { encoding: 'utf8' });
  } catch (e) {}
  return configs;
}

function getSSHKeys() {
  const keys = [];
  const sshDir = path.join(os.homedir(), '.ssh');
  
  if (fs.existsSync(sshDir)) {
    const files = fs.readdirSync(sshDir);
    for (const file of files) {
      if (file.endsWith('.pub')) {
        try {
          const content = fs.readFileSync(path.join(sshDir, file), 'utf8');
          keys.push({ name: file, content: content.trim() });
        } catch (e) {}
      }
    }
  }
  
  return keys;
}

function createSnapshot(name) {
  const config = getConfig();
  const timestamp = getTimestamp();
  const snapName = name || `snap-${timestamp}`;
  const snapPath = path.join(SNAP_DIR, `${snapName}.json`);
  
  console.log(`📸 Creating snapshot: ${snapName}`);
  
  const snapshot = {
    name: snapName,
    created: new Date().toISOString(),
    system: getSystemInfo(),
    packages: getInstalledPackages(),
    environment: getEnvVars(config),
    files: backupFiles(config),
    directories: backupDirs(config),
    git: getGitConfigs(),
    sshKeys: getSSHKeys(),
    config: config,
  };
  
  fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2));
  
  // Update latest symlink
  const latestPath = path.join(SNAP_DIR, 'latest.json');
  if (fs.existsSync(latestPath)) {
    fs.unlinkSync(latestPath);
  }
  fs.symlinkSync(snapPath, latestPath);
  
  console.log(`✅ Snapshot saved: ${snapPath}`);
  console.log(`📦 Packages captured: ${Object.values(snapshot.packages).flat().length} total`);
  console.log(`📄 Files backed up: ${Object.keys(snapshot.files).length}`);
  console.log(`📁 Directories backed up: ${Object.keys(snapshot.directories).length}`);
  
  return snapshot;
}

function listSnapshots() {
  const files = fs.readdirSync(SNAP_DIR)
    .filter(f => f.endsWith('.json') && f !== 'latest.json' && f !== 'config.json')
    .map(f => {
      const stat = fs.statSync(path.join(SNAP_DIR, f));
      const data = JSON.parse(fs.readFileSync(path.join(SNAP_DIR, f), 'utf8'));
      return {
        name: f.replace('.json', ''),
        created: data.created,
        size: stat.size,
        system: data.system,
      };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));
  
  if (files.length === 0) {
    console.log('No snapshots found.');
    return;
  }
  
  console.log(`Found ${files.length} snapshot(s):\n`);
  for (const snap of files) {
    const size = (snap.size / 1024).toFixed(1);
    const date = new Date(snap.created).toLocaleString();
    console.log(`  📸 ${snap.name}`);
    console.log(`     Created: ${date}`);
    console.log(`     Size: ${size} KB`);
    console.log(`     System: ${snap.system.platform} (${snap.system.arch})`);
    console.log();
  }
}

function showSnapshot(name) {
  const snapPath = path.join(SNAP_DIR, `${name}.json`);
  
  if (!fs.existsSync(snapPath)) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(1);
  }
  
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  
  console.log(`📸 Snapshot: ${snap.name}`);
  console.log(`   Created: ${new Date(snap.created).toLocaleString()}`);
  console.log(`   System: ${snap.system.platform} (${snap.system.arch})`);
  console.log(`   Host: ${snap.system.hostname}`);
  console.log();
  
  console.log('📦 Packages:');
  for (const [pm, pkgs] of Object.entries(snap.packages)) {
    if (pkgs.length > 0) {
      console.log(`   ${pm}: ${pkgs.length} packages`);
    }
  }
  console.log();
  
  console.log('📄 Files backed up:');
  for (const file of Object.keys(snap.files)) {
    console.log(`   ${file}`);
  }
  console.log();
  
  console.log('📁 Directories backed up:');
  for (const dir of Object.keys(snap.directories)) {
    console.log(`   ${dir}`);
  }
  console.log();
  
  console.log('🔧 Environment variables:');
  for (const [key, val] of Object.entries(snap.environment)) {
    console.log(`   ${key}=${val}`);
  }
  
  if (snap.sshKeys.length > 0) {
    console.log();
    console.log('🔑 SSH public keys:');
    for (const key of snap.sshKeys) {
      console.log(`   ${key.name}`);
    }
  }
}

function restoreSnapshot(name, options = {}) {
  const snapPath = path.join(SNAP_DIR, `${name}.json`);
  
  if (!fs.existsSync(snapPath)) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(1);
  }
  
  const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  
  console.log(`🔄 Restoring snapshot: ${snap.name}`);
  console.log(`   Created: ${new Date(snap.created).toLocaleString()}`);
  console.log();
  
  if (!options.force) {
    console.log('⚠️  This will overwrite existing files. Use --force to skip this warning.');
    console.log('   Run with --dry-run to see what would be changed.');
    return;
  }
  
  let restored = 0;
  let skipped = 0;
  
  // Restore files
  for (const [filePath, content] of Object.entries(snap.files)) {
    if (typeof content !== 'string') continue;
    
    const expanded = expandPath(filePath);
    const dir = path.dirname(expanded);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (options.dryRun) {
      console.log(`   [DRY-RUN] Would restore: ${filePath}`);
      continue;
    }
    
    // Backup existing file
    if (fs.existsSync(expanded)) {
      const backupPath = `${expanded}.backup.${getTimestamp()}`;
      fs.copyFileSync(expanded, backupPath);
    }
    
    fs.writeFileSync(expanded, content);
    console.log(`   ✅ Restored: ${filePath}`);
    restored++;
  }
  
  // Restore directories
  for (const [dirPath, files] of Object.entries(snap.directories)) {
    const expanded = expandPath(dirPath);
    
    for (const [fileName, content] of Object.entries(files)) {
      if (typeof content !== 'string') continue;
      
      const fullPath = path.join(expanded, fileName);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (options.dryRun) {
        console.log(`   [DRY-RUN] Would restore: ${path.join(dirPath, fileName)}`);
        continue;
      }
      
      fs.writeFileSync(fullPath, content);
      restored++;
    }
  }
  
  console.log();
  console.log(`✅ Restored ${restored} file(s)`);
  
  if (options.dryRun) {
    console.log('   (Dry run - no changes made)');
  }
  
  // Show restore instructions for packages
  console.log();
  console.log('📦 To restore packages, run:');
  if (snap.packages.npm?.length > 0) {
    console.log('   npm install -g ' + snap.packages.npm.map(p => p.name).join(' '));
  }
  if (snap.packages.cargo?.length > 0) {
    console.log('   cargo install ' + snap.packages.cargo.map(p => p.name).join(' '));
  }
}

function exportSnapshot(name, outputPath) {
  const snapPath = path.join(SNAP_DIR, `${name}.json`);
  
  if (!fs.existsSync(snapPath)) {
    console.error(`Snapshot not found: ${name}`);
    process.exit(1);
  }
  
  const destPath = outputPath || `${name}.devsnap.json`;
  fs.copyFileSync(snapPath, destPath);
  console.log(`📤 Exported: ${destPath}`);
}

function importSnapshot(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  const snap = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const destPath = path.join(SNAP_DIR, `${snap.name}.json`);
  
  fs.copyFileSync(filePath, destPath);
  console.log(`📥 Imported: ${snap.name}`);
}

function diffSnapshots(name1, name2) {
  const path1 = path.join(SNAP_DIR, `${name1}.json`);
  const path2 = path.join(SNAP_DIR, `${name2}.json`);
  
  if (!fs.existsSync(path1) || !fs.existsSync(path2)) {
    console.error('One or both snapshots not found');
    process.exit(1);
  }
  
  const snap1 = JSON.parse(fs.readFileSync(path1, 'utf8'));
  const snap2 = JSON.parse(fs.readFileSync(path2, 'utf8'));
  
  console.log(`📊 Comparing: ${name1} vs ${name2}\n`);
  
  // Compare packages
  console.log('📦 Package changes:');
  for (const pm of Object.keys({ ...snap1.packages, ...snap2.packages })) {
    const pkgs1 = snap1.packages[pm] || [];
    const pkgs2 = snap2.packages[pm] || [];
    
    const names1 = new Set(pkgs1.map(p => p.name || p));
    const names2 = new Set(pkgs2.map(p => p.name || p));
    
    const added = [...names2].filter(n => !names1.has(n));
    const removed = [...names1].filter(n => !names2.has(n));
    
    if (added.length > 0 || removed.length > 0) {
      console.log(`   ${pm}:`);
      for (const pkg of added) console.log(`     + ${pkg}`);
      for (const pkg of removed) console.log(`     - ${pkg}`);
    }
  }
  
  // Compare files
  console.log('\n📄 File changes:');
  const files1 = Object.keys(snap1.files);
  const files2 = Object.keys(snap2.files);
  
  const addedFiles = files2.filter(f => !files1.includes(f));
  const removedFiles = files1.filter(f => !files2.includes(f));
  
  for (const f of addedFiles) console.log(`   + ${f}`);
  for (const f of removedFiles) console.log(`   - ${f}`);
}

function editConfig() {
  const config = getConfig();
  const editor = process.env.EDITOR || 'nano';
  
  execSync(`${editor} "${CONFIG_FILE}"`, { stdio: 'inherit' });
  console.log('✅ Configuration updated');
}

function showHelp() {
  console.log(`
devsnap - Development Environment Snapshot & Restore

Usage:
  devsnap snap [name]           Create a new snapshot
  devsnap list                  List all snapshots
  devsnap show <name>           Show snapshot details
  devsnap restore <name>        Restore from snapshot (use --force)
  devsnap export <name> [path]  Export snapshot to file
  devsnap import <path>         Import snapshot from file
  devsnap diff <n1> <n2>        Compare two snapshots
  devsnap config                Edit configuration
  devsnap help                  Show this help

Options:
  --force      Skip confirmation prompts
  --dry-run    Show what would be changed without making changes

Examples:
  devsnap snap my-setup
  devsnap restore my-setup --force
  devsnap diff snap-2024-01-01 snap-2024-02-01
`);
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const options = {
  force: args.includes('--force'),
  dryRun: args.includes('--dry-run'),
};

switch (command) {
  case 'snap':
  case 'snapshot':
    createSnapshot(args[1]);
    break;
    
  case 'list':
  case 'ls':
    listSnapshots();
    break;
    
  case 'show':
  case 'info':
    showSnapshot(args[1]);
    break;
    
  case 'restore':
    restoreSnapshot(args[1], options);
    break;
    
  case 'export':
    exportSnapshot(args[1], args[2]);
    break;
    
  case 'import':
    importSnapshot(args[1]);
    break;
    
  case 'diff':
    diffSnapshots(args[1], args[2]);
    break;
    
  case 'config':
    editConfig();
    break;
    
  case 'help':
  case '--help':
  case '-h':
  default:
    showHelp();
    break;
}
