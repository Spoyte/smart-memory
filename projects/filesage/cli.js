#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { Embedder } = require('./src/embedder');
const { FileScanner } = require('./src/scanner');
const path = require('path');
const fs = require('fs');

const program = new Command();
const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.filesage', 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return { indexedPaths: [] };
  }
}

function saveConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

program
  .name('filesage')
  .description('Natural language file search with local embeddings')
  .version('1.0.0');

program
  .command('index')
  .description('Index a directory for search')
  .argument('<directory>', 'Directory to index')
  .option('-c, --code-only', 'Index only code files')
  .action(async (directory, options) => {
    const dirPath = path.resolve(directory);
    
    if (!fs.existsSync(dirPath)) {
      console.log(chalk.red(`❌ Directory not found: ${dirPath}`));
      process.exit(1);
    }

    console.log(chalk.blue(`📁 Indexing: ${dirPath}`));
    
    const embedder = new Embedder();
    await embedder.init();
    
    const scanner = new FileScanner();
    const files = options.codeOnly 
      ? await scanner.scanCode(dirPath)
      : await scanner.scan(dirPath);
    
    console.log(chalk.gray(`Found ${files.length} files to index...`));
    
    let processed = 0;
    for (const file of files) {
      try {
        // Create a rich text representation for embedding
        const textToEmbed = `
File: ${path.basename(file.path)}
Path: ${file.relativePath}
Content: ${file.content}
        `.trim();
        
        const embedding = await embedder.embed(textToEmbed);
        embedder.storeFile(file.path, file.content, embedding);
        
        processed++;
        if (processed % 10 === 0) {
          process.stdout.write(chalk.gray(`\r  Indexed ${processed}/${files.length}...`));
        }
      } catch (err) {
        console.log(chalk.yellow(`\n⚠️  Skipped ${file.path}: ${err.message}`));
      }
    }
    
    console.log(chalk.green(`\n✅ Indexed ${processed} files`));
    
    // Save to config
    const config = loadConfig();
    if (!config.indexedPaths.includes(dirPath)) {
      config.indexedPaths.push(dirPath);
      saveConfig(config);
    }
    
    embedder.close();
  });

program
  .command('search')
  .description('Search files using natural language')
  .argument('<query>', 'Search query')
  .option('-n, --limit <n>', 'Number of results', '10')
  .action(async (query, options) => {
    const embedder = new Embedder();
    await embedder.init();
    
    console.log(chalk.blue(`🔍 Searching: "${query}"`));
    console.log(chalk.gray('Generating embedding for query...\n'));
    
    const queryEmbedding = await embedder.embed(query);
    const results = embedder.searchSimilar(queryEmbedding, parseInt(options.limit));
    
    if (results.length === 0) {
      console.log(chalk.yellow('No results found.'));
      
      // Try FTS fallback
      console.log(chalk.gray('\nTrying text search fallback...'));
      const ftsResults = embedder.searchFts(query);
      if (ftsResults.length > 0) {
        console.log(chalk.blue(`\nFound ${ftsResults.length} results via text search:\n`));
        ftsResults.forEach((r, i) => {
          console.log(`${i + 1}. ${chalk.cyan(r.path)}`);
        });
      }
    } else {
      console.log(chalk.green(`Found ${results.length} results:\n`));
      results.forEach((r, i) => {
        const similarity = (r.similarity * 100).toFixed(1);
        const color = r.similarity > 0.7 ? chalk.green : r.similarity > 0.5 ? chalk.yellow : chalk.gray;
        console.log(`${i + 1}. ${chalk.cyan(r.path)} ${color(`(${similarity}%)`)}`);
        if (r.content) {
          const preview = r.content.replace(/\n/g, ' ').substring(0, 100);
          console.log(chalk.gray(`   ${preview}...`));
        }
        console.log();
      });
    }
    
    embedder.close();
  });

program
  .command('status')
  .description('Show indexing status')
  .action(async () => {
    const embedder = new Embedder();
    await embedder.init();
    
    const stats = embedder.getStats();
    const config = loadConfig();
    
    console.log(chalk.blue('📊 FileSage Status\n'));
    console.log(`Indexed files: ${chalk.green(stats.indexedFiles)}`);
    console.log(`Indexed paths: ${config.indexedPaths.length > 0 ? config.indexedPaths.map(p => chalk.gray(p)).join('\n               ') : chalk.gray('none')}`);
    
    embedder.close();
  });

program
  .command('remove')
  .description('Remove a path from index')
  .argument('<directory>', 'Directory to remove')
  .action(async (directory) => {
    const embedder = new Embedder();
    await embedder.init();
    
    const dirPath = path.resolve(directory);
    const pattern = `${dirPath}%`;
    
    const stmt = embedder.db.prepare('DELETE FROM files WHERE path LIKE ?');
    const result = stmt.run(pattern);
    
    console.log(chalk.green(`✅ Removed ${result.changes} files from index`));
    
    // Update config
    const config = loadConfig();
    config.indexedPaths = config.indexedPaths.filter(p => p !== dirPath);
    saveConfig(config);
    
    embedder.close();
  });

program.parse();
