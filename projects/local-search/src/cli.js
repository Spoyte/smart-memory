#!/usr/bin/env node

const SearchEngine = require('./engine');

const COLOR = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function showHelp() {
  console.log(`
${COLOR.bold('local-search')} - Fast local full-text search for your files

${COLOR.bold('USAGE:')}
  local-search <command> [options]

${COLOR.bold('COMMANDS:')}
  index [path]     Index files in a directory (default: current directory)
  search <query>   Search the index
  update           Update index with changed files
  stats            Show index statistics
  help             Show this help message

${COLOR.bold('OPTIONS:')}
  -f, --force      Force full re-index (with index command)
  -e, --ext        Filter by file extension, comma-separated (with search)
  -l, --limit      Maximum number of results (with search, default: 20)

${COLOR.bold('EXAMPLES:')}
  local-search index .
  local-search search "function signature"
  local-search search "config" --ext js,json
  local-search update
  local-search stats
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }
  
  const options = {};
  const positional = [];
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-f' || arg === '--force') {
      options.force = true;
    } else if (arg === '-e' || arg === '--ext') {
      options.ext = args[++i];
    } else if (arg === '-l' || arg === '--limit') {
      options.limit = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  
  return { command, options, positional };
}

async function main() {
  const { command, options, positional } = parseArgs();
  const engine = new SearchEngine();
  
  try {
    switch (command) {
      case 'index': {
        const dirPath = positional[0] || '.';
        const fullPath = require('path').resolve(dirPath);
        console.log(COLOR.cyan(`Indexing files in ${fullPath}...`));
        
        const stats = await engine.indexDirectory(fullPath, options.force);
        console.log(COLOR.green(`✓ Indexed ${stats.filesIndexed} files in ${stats.duration}ms`));
        console.log(COLOR.dim(`  Skipped: ${stats.binaryFiles} binary, ${stats.ignoredFiles} ignored`));
        break;
      }
      
      case 'search': {
        if (!positional[0]) {
          console.error(COLOR.red('Error: Search query required'));
          process.exit(1);
        }
        
        const query = positional[0];
        const extensions = options.ext ? options.ext.split(',').map(e => e.trim()) : [];
        const limit = options.limit || 20;
        
        const results = await engine.search(query, extensions, limit);
        
        if (results.length === 0) {
          console.log(COLOR.yellow('No results found.'));
          return;
        }
        
        console.log(COLOR.cyan(`Found ${results.length} results:\n`));
        
        results.forEach((result, i) => {
          const num = COLOR.bold(`${i + 1}.`);
          const filePath = COLOR.blue(result.path);
          console.log(`${num} ${filePath}`);
          
          if (result.preview) {
            console.log(COLOR.dim(`   ${result.preview}`));
          }
          console.log(COLOR.dim(`   Score: ${result.score.toFixed(2)} | ${result.filename}`));
          console.log();
        });
        break;
      }
      
      case 'update': {
        console.log(COLOR.cyan('Updating index...'));
        const stats = await engine.update();
        console.log(COLOR.green(`✓ Updated: ${stats.added} added, ${stats.removed} removed, ${stats.modified} modified`));
        break;
      }
      
      case 'stats': {
        const stats = await engine.getStats();
        console.log(COLOR.bold('Index Statistics'));
        console.log(`  Documents: ${stats.docCount}`);
        console.log(`  Index size: ${stats.indexSizeMB.toFixed(2)} MB`);
        console.log(`  Last updated: ${stats.lastUpdated}`);
        break;
      }
      
      default:
        console.error(COLOR.red(`Unknown command: ${command}`));
        showHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(COLOR.red(`Error: ${err.message}`));
    process.exit(1);
  } finally {
    engine.close();
  }
}

main();
