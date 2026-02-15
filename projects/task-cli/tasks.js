#!/usr/bin/env node

/**
 * task-cli - Simple, persistent task management with natural language dates
 * Usage: tasks add "review PR tomorrow at 3pm"
 *        tasks list
 *        tasks done <id>
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_FILE = path.join(os.homedir(), '.tasks.json');

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Priority levels with colors
const PRIORITIES = {
  low: { color: COLORS.dim, weight: 1 },
  normal: { color: COLORS.reset, weight: 2 },
  high: { color: COLORS.yellow, weight: 3 },
  urgent: { color: COLORS.red, weight: 4 },
};

// Load tasks from disk
function loadTasks() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

// Save tasks to disk
function saveTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Parse natural language date
function parseNaturalDate(input) {
  const now = new Date();
  const lower = input.toLowerCase().trim();
  
  // Handle "tomorrow"
  if (lower === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  
  // Handle "today"
  if (lower === 'today') {
    const d = new Date(now);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  
  // Handle "next week"
  if (lower === 'next week') {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  
  // Handle "in X days/hours/minutes"
  const inMatch = lower.match(/in (\d+) (day|days|hour|hours|minute|minutes|min|mins)/);
  if (inMatch) {
    const num = parseInt(inMatch[1]);
    const unit = inMatch[2];
    const d = new Date(now);
    if (unit.startsWith('day')) d.setDate(d.getDate() + num);
    else if (unit.startsWith('hour')) d.setHours(d.getHours() + num);
    else d.setMinutes(d.getMinutes() + num);
    return d;
  }
  
  // Try standard date parsing
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

// Extract date from task text and return { text, due }
function extractDate(text) {
  // Patterns to match: "by tomorrow", "due Friday", "at 3pm", etc.
  const patterns = [
    { regex: /\bby\s+(.+?)(?:\s*$|(?=\s+(?:with|#|@)))/i, group: 1 },
    { regex: /\bdue\s+(.+?)(?:\s*$|(?=\s+(?:with|#|@)))/i, group: 1 },
    { regex: /\bat\s+(.+?)(?:\s*$|(?=\s+(?:with|#|@)))/i, group: 1 },
    { regex: /\bon\s+(.+?)(?:\s*$|(?=\s+(?:with|#|@)))/i, group: 1 },
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      const dateStr = match[pattern.group].trim();
      const parsed = parseNaturalDate(dateStr);
      if (parsed) {
        // Remove the date part from text
        const cleanText = text.replace(match[0], '').trim().replace(/\s+/g, ' ');
        return { text: cleanText, due: parsed.toISOString() };
      }
    }
  }
  
  return { text, due: null };
}

// Extract tags from text (#tag)
function extractTags(text) {
  const tags = [];
  const cleanText = text.replace(/#(\w+)/g, (match, tag) => {
    tags.push(tag);
    return '';
  }).trim().replace(/\s+/g, ' ');
  return { text: cleanText, tags };
}

// Extract priority from text (!urgent, !high, !low)
function extractPriority(text) {
  const priorityMatch = text.match(/!(urgent|high|low)\b/i);
  if (priorityMatch) {
    const priority = priorityMatch[1].toLowerCase();
    const cleanText = text.replace(priorityMatch[0], '').trim().replace(/\s+/g, ' ');
    return { text: cleanText, priority };
  }
  return { text, priority: 'normal' };
}

// Format date for display
function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `${COLORS.red}overdue${COLORS.reset}`;
  if (diffDays === 0) return `${COLORS.yellow}today${COLORS.reset}`;
  if (diffDays === 1) return `${COLORS.cyan}tomorrow${COLORS.reset}`;
  if (diffDays < 7) return `${COLORS.cyan}in ${diffDays} days${COLORS.reset}`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format relative time
function formatRelativeTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Add a new task
function addTask(args) {
  const input = args.join(' ');
  if (!input.trim()) {
    console.log(`${COLORS.red}Error: Task description required${COLORS.reset}`);
    console.log(`Usage: tasks add "review PR by tomorrow"`);
    return;
  }
  
  // Extract metadata
  let { text, due } = extractDate(input);
  let tagsResult = extractTags(text);
  text = tagsResult.text;
  let priorityResult = extractPriority(text);
  text = priorityResult.text;
  
  const task = {
    id: generateId(),
    title: text,
    description: '',
    created: new Date().toISOString(),
    due,
    completed: null,
    priority: priorityResult.priority,
    tags: tagsResult.tags,
  };
  
  const tasks = loadTasks();
  tasks.push(task);
  saveTasks(tasks);
  
  console.log(`${COLORS.green}✓ Added task:${COLORS.reset} ${task.title}`);
  if (due) console.log(`  Due: ${formatDate(due)}`);
  if (task.tags.length) console.log(`  Tags: ${task.tags.map(t => `#${t}`).join(' ')}`);
  if (task.priority !== 'normal') console.log(`  Priority: ${task.priority}`);
}

// List tasks
function listTasks(args) {
  const tasks = loadTasks();
  const pending = tasks.filter(t => !t.completed);
  
  // Parse filters
  const filterTag = args.find(a => a.startsWith('#'))?.slice(1);
  const filterPriority = args.find(a => ['low', 'normal', 'high', 'urgent'].includes(a.toLowerCase()))?.toLowerCase();
  
  let filtered = pending;
  if (filterTag) filtered = filtered.filter(t => t.tags.includes(filterTag));
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);
  
  // Sort by priority weight, then due date
  filtered.sort((a, b) => {
    const prioDiff = (PRIORITIES[b.priority]?.weight || 2) - (PRIORITIES[a.priority]?.weight || 2);
    if (prioDiff !== 0) return prioDiff;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return new Date(a.due) - new Date(b.due);
  });
  
  if (filtered.length === 0) {
    console.log(`${COLORS.dim}No pending tasks. Great job!${COLORS.reset}`);
    return;
  }
  
  console.log(`\n${COLORS.bright}Pending Tasks (${filtered.length}/${pending.length}):${COLORS.reset}\n`);
  
  filtered.forEach(task => {
    const prio = PRIORITIES[task.priority] || PRIORITIES.normal;
    const dueStr = task.due ? ` [${formatDate(task.due)}]` : '';
    const tagStr = task.tags.length ? ` ${COLORS.dim}${task.tags.map(t => `#${t}`).join(' ')}${COLORS.reset}` : '';
    const shortId = task.id.slice(-6);
    
    console.log(`  ${prio.color}[${task.priority[0].toUpperCase()}]${COLORS.reset} ${task.title}${dueStr}${tagStr}`);
    console.log(`      ${COLORS.dim}${shortId} • ${formatRelativeTime(task.created)}${COLORS.reset}`);
  });
  
  console.log();
}

// Mark task as done
function doneTask(args) {
  if (args.length === 0) {
    console.log(`${COLORS.red}Error: Task ID required${COLORS.reset}`);
    return;
  }
  
  const idQuery = args[0];
  const tasks = loadTasks();
  
  // Find by full or partial ID
  const task = tasks.find(t => t.id === idQuery || t.id.endsWith(idQuery));
  
  if (!task) {
    console.log(`${COLORS.red}Error: Task not found: ${idQuery}${COLORS.reset}`);
    return;
  }
  
  if (task.completed) {
    console.log(`${COLORS.yellow}Task already completed${COLORS.reset}`);
    return;
  }
  
  task.completed = new Date().toISOString();
  saveTasks(tasks);
  
  console.log(`${COLORS.green}✓ Completed:${COLORS.reset} ${task.title}`);
}

// Remove a task
function removeTask(args) {
  if (args.length === 0) {
    console.log(`${COLORS.red}Error: Task ID required${COLORS.reset}`);
    return;
  }
  
  const idQuery = args[0];
  const tasks = loadTasks();
  const index = tasks.findIndex(t => t.id === idQuery || t.id.endsWith(idQuery));
  
  if (index === -1) {
    console.log(`${COLORS.red}Error: Task not found: ${idQuery}${COLORS.reset}`);
    return;
  }
  
  const task = tasks[index];
  tasks.splice(index, 1);
  saveTasks(tasks);
  
  console.log(`${COLORS.yellow}✗ Removed:${COLORS.reset} ${task.title}`);
}

// Search tasks
function searchTasks(args) {
  const query = args.join(' ').toLowerCase();
  const tasks = loadTasks();
  
  const results = tasks.filter(t => 
    t.title.toLowerCase().includes(query) ||
    t.tags.some(tag => tag.toLowerCase().includes(query))
  );
  
  if (results.length === 0) {
    console.log(`${COLORS.dim}No tasks found matching "${query}"${COLORS.reset}`);
    return;
  }
  
  console.log(`\n${COLORS.bright}Search Results (${results.length}):${COLORS.reset}\n`);
  
  results.forEach(task => {
    const status = task.completed ? `${COLORS.green}[✓]${COLORS.reset}` : `${COLORS.yellow}[ ]${COLORS.reset}`;
    const dueStr = task.due ? ` [${formatDate(task.due)}]` : '';
    console.log(`  ${status} ${task.title}${dueStr}`);
  });
  
  console.log();
}

// Show task statistics
function showStats() {
  const tasks = loadTasks();
  const total = tasks.length;
  const pending = tasks.filter(t => !t.completed).length;
  const completed = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => !t.completed && t.due && new Date(t.due) < new Date()).length;
  
  const byPriority = {
    urgent: tasks.filter(t => !t.completed && t.priority === 'urgent').length,
    high: tasks.filter(t => !t.completed && t.priority === 'high').length,
    normal: tasks.filter(t => !t.completed && t.priority === 'normal').length,
    low: tasks.filter(t => !t.completed && t.priority === 'low').length,
  };
  
  console.log(`\n${COLORS.bright}Task Statistics:${COLORS.reset}\n`);
  console.log(`  Total:     ${total}`);
  console.log(`  Pending:   ${COLORS.yellow}${pending}${COLORS.reset}`);
  console.log(`  Completed: ${COLORS.green}${completed}${COLORS.reset}`);
  if (overdue) console.log(`  Overdue:   ${COLORS.red}${overdue}${COLORS.reset}`);
  console.log();
  console.log(`  By Priority:`);
  console.log(`    Urgent:  ${byPriority.urgent ? COLORS.red + byPriority.urgent + COLORS.reset : 0}`);
  console.log(`    High:    ${byPriority.high ? COLORS.yellow + byPriority.high + COLORS.reset : 0}`);
  console.log(`    Normal:  ${byPriority.normal}`);
  console.log(`    Low:     ${byPriority.low}`);
  console.log();
}

// Show help
function showHelp() {
  console.log(`
${COLORS.bright}task-cli${COLORS.reset} - Simple task management with natural language

${COLORS.bright}Usage:${COLORS.reset}
  tasks add "description [by DATE] [!priority] [#tag]"   Add a new task
  tasks list [priority] [#tag]                          List pending tasks
  tasks done <id>                                       Mark task as complete
  tasks remove <id>                                     Delete a task
  tasks search <query>                                  Search tasks
  tasks stats                                           Show statistics
  tasks help                                            Show this help

${COLORS.bright}Date Formats:${COLORS.reset}
  by tomorrow, by today, by next week
  by Monday, by 2026-02-20
  in 3 days, in 2 hours

${COLORS.bright}Examples:${COLORS.reset}
  tasks add "review PR by tomorrow #work !high"
  tasks add "call mom on Sunday"
  tasks add "deploy to production by Friday 5pm !urgent"
  tasks list urgent
  tasks done abc123
`);
}

// Main CLI handler
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const restArgs = args.slice(1);
  
  switch (command) {
    case 'add':
    case 'a':
      addTask(restArgs);
      break;
    case 'list':
    case 'ls':
    case 'l':
      listTasks(restArgs);
      break;
    case 'done':
    case 'complete':
    case 'd':
      doneTask(restArgs);
      break;
    case 'remove':
    case 'rm':
    case 'delete':
      removeTask(restArgs);
      break;
    case 'search':
    case 'find':
    case 's':
      searchTasks(restArgs);
      break;
    case 'stats':
      showStats();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      showHelp();
      break;
  }
}

main();
