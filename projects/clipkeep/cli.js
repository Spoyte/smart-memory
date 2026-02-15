#!/usr/bin/env node

const { Command } = require('commander');
const clipboard = require('clipboardy');
const db = require('./src/db');
const { categorize, getCategoryIcon, truncate, formatPreview } = require('./src/categorize');

const program = new Command();

program
  .name('clipkeep')
  .description('Smart clipboard manager with auto-categorization')
  .version('1.0.0');

program
  .command('daemon')
  .description('Start the clipboard monitoring daemon')
  .option('-i, --interval <ms>', 'Polling interval in ms', '500')
  .action(async (options) => {
    const interval = parseInt(options.interval);
    console.log('🔍 ClipKeep daemon started (Ctrl+C to stop)');
    console.log(`   Polling every ${interval}ms`);
    
    let lastContent = '';
    
    const checkClipboard = async () => {
      try {
        const content = await clipboard.read();
        
        if (content !== lastContent && content.trim()) {
          lastContent = content;
          const category = categorize(content);
          
          // Don't store empty or duplicate (checked via DB in real implementation)
          if (category !== 'empty') {
            db.insert(content, category);
            const icon = getCategoryIcon(category);
            console.log(`${icon} [${category}] ${truncate(content, 60)}`);
          }
        }
      } catch (err) {
        // Clipboard might be temporarily unavailable
      }
    };
    
    // Initial check
    await checkClipboard();
    
    // Poll
    const timer = setInterval(checkClipboard, interval);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      clearInterval(timer);
      db.close();
      console.log('\n👋 Daemon stopped');
      process.exit(0);
    });
  });

program
  .command('search <query>')
  .description('Search clipboard history')
  .option('-l, --limit <n>', 'Maximum results', '20')
  .action((query, options) => {
    const results = db.search(query, parseInt(options.limit));
    
    if (results.length === 0) {
      console.log('No results found');
      return;
    }
    
    console.log(`Found ${results.length} result(s):\n`);
    results.forEach((clip, i) => {
      const icon = getCategoryIcon(clip.category);
      const date = new Date(clip.created_at).toLocaleString();
      console.log(`${i + 1}. ${icon} [${clip.category}] ${date}`);
      console.log(`   ${truncate(clip.content, 100)}`);
      console.log();
    });
    
    db.close();
  });

program
  .command('recent')
  .description('Show recent clipboard items')
  .option('-l, --limit <n>', 'Number of items', '10')
  .option('-c, --category <cat>', 'Filter by category')
  .action((options) => {
    const limit = parseInt(options.limit);
    const results = options.category 
      ? db.byCategory(options.category, limit)
      : db.recent(limit);
    
    if (results.length === 0) {
      console.log('No clipboard history found');
      return;
    }
    
    console.log(`Recent ${options.category || ''} clips:\n`);
    results.forEach((clip, i) => {
      const icon = getCategoryIcon(clip.category);
      const date = new Date(clip.created_at).toLocaleTimeString();
      console.log(`${i + 1}. ${icon} ${date}`);
      console.log(`   ${truncate(clip.content, 100)}`);
      console.log();
    });
    
    db.close();
  });

program
  .command('categories')
  .description('List all categories and counts')
  .action(() => {
    const stats = db.stats();
    console.log('Categories:');
    console.log('  🔗  url      - Web links');
    console.log('  📧  email    - Email addresses');
    console.log('  📞  phone    - Phone numbers');
    console.log('  🌐  ip       - IP addresses');
    console.log('  🎨  color    - Hex colors');
    console.log('  💻  code     - Code snippets');
    console.log('  📍  address  - Physical addresses');
    console.log('  📝  text     - Plain text');
    console.log();
    console.log(`Total clips: ${stats.total}`);
    console.log(`Last clip: ${stats.last_clip || 'Never'}`);
    db.close();
  });

program
  .command('clean')
  .description('Remove old clipboard history')
  .option('-d, --days <n>', 'Remove items older than N days', '30')
  .action((options) => {
    const days = parseInt(options.days);
    const result = db.deleteOlderThan(days);
    console.log(`Deleted ${result.changes} item(s) older than ${days} days`);
    db.close();
  });

program
  .command('copy <id>')
  .description('Copy a specific history item back to clipboard')
  .action(async (id) => {
    // Simple implementation - would need getById in real version
    console.log('Feature: Copy item by ID (coming in v1.1)');
    db.close();
  });

program.parse();
