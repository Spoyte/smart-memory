#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

const COLOR = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// Simple markdown to HTML converter
function markdownToHtml(markdown) {
  let html = markdown;
  
  // Escape HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
  
  // Lists
  html = html.replace(/^\s*[-*+]\s+(.+)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Ordered lists
  html = html.replace(/^\s*\d+\.\s+(.+)$/gim, '<li>$1</li>');
  
  // Blockquotes
  html = html.replace(/^\>\s*(.+)$/gim, '<blockquote>$1</blockquote>');
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  
  // Paragraphs (lines that aren't tags)
  html = html.replace(/^(?!<[a-z]|<\/|<li|<\/li|<ul|<\/ul|<ol|<\/ol|<h|<\/h|<pre|<\/pre|<blockquote|<\/blockquote|<hr|<\/hr|<img)(.+)$/gim, '<p>$1</p>');
  
  // Line breaks
  html = html.replace(/\n/g, '');
  
  return html;
}

// Parse slides from markdown
function parseSlides(markdown) {
  const slides = [];
  const parts = markdown.split(/^---$/gm);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Extract speaker notes
    const noteMatch = trimmed.match(/<!--\s*(?:speaker\s+)?notes?:?\s*(.*?)\s*-->/is);
    const notes = noteMatch ? noteMatch[1].trim() : '';
    const content = trimmed.replace(/<!--.*?-->/gs, '').trim();
    
    if (content) {
      slides.push({
        content: markdownToHtml(content),
        notes: notes
      });
    }
  }
  
  return slides;
}

// Generate HTML presentation
function generateHtml(slides, theme = 'default') {
  const themes = {
    default: {
      bg: '#ffffff',
      text: '#333333',
      heading: '#1a1a1a',
      accent: '#0066cc',
      codeBg: '#f5f5f5'
    },
    dark: {
      bg: '#1a1a1a',
      text: '#e0e0e0',
      heading: '#ffffff',
      accent: '#66b3ff',
      codeBg: '#2d2d2d'
    },
    minimal: {
      bg: '#fafafa',
      text: '#444444',
      heading: '#000000',
      accent: '#ff6b6b',
      codeBg: '#f0f0f0'
    }
  };
  
  const t = themes[theme] || themes.default;
  
  const slidesHtml = slides.map((slide, i) => `
    <div class="slide" data-index="${i}" style="display: ${i === 0 ? 'flex' : 'none'}">
      <div class="slide-content">
        ${slide.content}
      </div>
      ${slide.notes ? `<div class="speaker-notes">${slide.notes}</div>` : ''}
    </div>
  `).join('');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SlideDeck Presentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: ${t.bg};
      color: ${t.text};
      overflow: hidden;
    }
    
    .slide {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4rem;
    }
    
    .slide-content {
      max-width: 1000px;
      width: 100%;
      font-size: 1.5rem;
      line-height: 1.6;
    }
    
    .slide-content h1 {
      font-size: 3.5rem;
      color: ${t.heading};
      margin-bottom: 1rem;
    }
    
    .slide-content h2 {
      font-size: 2.5rem;
      color: ${t.heading};
      margin-bottom: 1.5rem;
      border-bottom: 3px solid ${t.accent};
      padding-bottom: 0.5rem;
    }
    
    .slide-content h3 {
      font-size: 2rem;
      color: ${t.heading};
      margin-bottom: 1rem;
    }
    
    .slide-content p {
      margin-bottom: 1rem;
    }
    
    .slide-content ul, .slide-content ol {
      margin-left: 2rem;
      margin-bottom: 1rem;
    }
    
    .slide-content li {
      margin-bottom: 0.5rem;
    }
    
    .slide-content code {
      background: ${t.codeBg};
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9em;
    }
    
    .slide-content pre {
      background: ${t.codeBg};
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    
    .slide-content pre code {
      background: none;
      padding: 0;
    }
    
    .slide-content blockquote {
      border-left: 4px solid ${t.accent};
      padding-left: 1rem;
      margin: 1rem 0;
      font-style: italic;
    }
    
    .slide-content a {
      color: ${t.accent};
      text-decoration: none;
    }
    
    .slide-content a:hover {
      text-decoration: underline;
    }
    
    .slide-content img {
      max-width: 100%;
      height: auto;
    }
    
    .speaker-notes {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #333;
      color: #fff;
      padding: 1rem;
      font-size: 1rem;
      display: none;
    }
    
    .speaker-notes.visible {
      display: block;
    }
    
    .controls {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
      z-index: 100;
    }
    
    .controls button {
      background: ${t.accent};
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    .controls button:hover {
      opacity: 0.9;
    }
    
    .progress {
      position: fixed;
      bottom: 0;
      left: 0;
      height: 4px;
      background: ${t.accent};
      transition: width 0.3s;
    }
    
    .slide-number {
      position: fixed;
      bottom: 1rem;
      left: 1rem;
      color: ${t.text};
      opacity: 0.5;
      font-size: 0.9rem;
    }
    
    @media print {
      .slide {
        display: flex !important;
        page-break-after: always;
        height: 100vh;
      }
      .controls, .progress, .slide-number, .speaker-notes {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${slidesHtml}
  
  <div class="progress" style="width: ${100 / slides.length}%"></div>
  <div class="slide-number">1 / ${slides.length}</div>
  
  <div class="controls">
    <button onclick="prevSlide()">← Prev</button>
    <button onclick="nextSlide()">Next →</button>
  </div>
  
  <script>
    let currentSlide = 0;
    const totalSlides = ${slides.length};
    const slides = document.querySelectorAll('.slide');
    const progress = document.querySelector('.progress');
    const slideNumber = document.querySelector('.slide-number');
    
    function showSlide(n) {
      if (n < 0) n = 0;
      if (n >= totalSlides) n = totalSlides - 1;
      
      slides.forEach((slide, i) => {
        slide.style.display = i === n ? 'flex' : 'none';
      });
      
      currentSlide = n;
      progress.style.width = ((currentSlide + 1) / totalSlides * 100) + '%';
      slideNumber.textContent = (currentSlide + 1) + ' / ' + totalSlides;
    }
    
    function nextSlide() {
      showSlide(currentSlide + 1);
    }
    
    function prevSlide() {
      showSlide(currentSlide - 1);
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        document.documentElement.requestFullscreen();
      } else if (e.key === 's' || e.key === 'S') {
        document.querySelectorAll('.speaker-notes').forEach(n => {
          n.classList.toggle('visible');
        });
      } else if (e.key === '.') {
        document.body.style.background = document.body.style.background === 'black' ? '' : 'black';
      }
    });
    
    // Touch support
    let touchStartX = 0;
    document.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    });
    document.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        diff > 0 ? nextSlide() : prevSlide();
      }
    });
  </script>
</body>
</html>`;
}

// Create sample presentation
function createSamplePresentation(name) {
  const dir = path.resolve(name);
  if (fs.existsSync(dir)) {
    console.error(COLOR.red(`Error: Directory ${name} already exists`));
    process.exit(1);
  }
  
  fs.mkdirSync(dir, { recursive: true });
  
  const sampleMarkdown = `# Welcome to SlideDeck

A simple way to create presentations from Markdown.

---

## Getting Started

1. Write your slides in Markdown
2. Separate slides with three dashes: \`---\`
3. Run \`slidedeck serve slides.md\`

---

## Features

- **Simple**: Just Markdown, no complex UI
- **Fast**: Instant preview as you edit
- **Beautiful**: Clean, professional themes
- **Portable**: Works offline, export to PDF

---

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

---

## The End

Thanks for trying SlideDeck!

<!-- Speaker notes: Ask if there are any questions -->
`;
  
  fs.writeFileSync(path.join(dir, 'slides.md'), sampleMarkdown);
  console.log(COLOR.green(`✓ Created presentation: ${dir}`));
  console.log(COLOR.dim(`  Run: slidedeck serve ${dir}/slides.md`));
}

// Serve presentation with live reload
function servePresentation(filePath, port = 8080) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(COLOR.red(`Error: File not found: ${filePath}`));
    process.exit(1);
  }
  
  let lastContent = '';
  
  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      const content = fs.readFileSync(fullPath, 'utf8');
      lastContent = content;
      const slides = parseSlides(content);
      const html = generateHtml(slides);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.url === '/reload') {
      // Simple polling endpoint for live reload
      const content = fs.readFileSync(fullPath, 'utf8');
      const changed = content !== lastContent;
      if (changed) lastContent = content;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ changed }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  
  server.listen(port, () => {
    console.log(COLOR.green(`✓ Server running at http://localhost:${port}`));
    console.log(COLOR.dim(`  Watching: ${fullPath}`));
    console.log(COLOR.dim(`  Press Ctrl+C to stop`));
    
    // Open browser
    const url = `http://localhost:${port}`;
    const cmd = process.platform === 'darwin' ? 'open' : 
                process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`);
  });
}

// Export to static HTML
function exportPresentation(filePath, outputPath) {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.error(COLOR.red(`Error: File not found: ${filePath}`));
    process.exit(1);
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const slides = parseSlides(content);
  const html = generateHtml(slides);
  
  const outPath = outputPath || fullPath.replace('.md', '.html');
  fs.writeFileSync(outPath, html);
  console.log(COLOR.green(`✓ Exported to: ${outPath}`));
}

// Show help
function showHelp() {
  console.log(`
${COLOR.bold('slidedeck')} - Markdown to HTML presentations

${COLOR.bold('USAGE:')}
  slidedeck <command> [options]

${COLOR.bold('COMMANDS:')}
  init <name>           Create a new presentation
  serve <file>          Start server with live reload
  export <file>         Export to static HTML
  help                  Show this help message

${COLOR.bold('OPTIONS:')}
  -p, --port <n>        Port for serve command (default: 8080)

${COLOR.bold('EXAMPLES:')}
  slidedeck init my-talk
  slidedeck serve my-talk/slides.md
  slidedeck export my-talk/slides.md -o presentation.html
`);
}

// Parse arguments
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
    if (arg === '-p' || arg === '--port') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '-o' || arg === '--output') {
      options.output = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }
  
  return { command, options, positional };
}

// Main
function main() {
  const { command, options, positional } = parseArgs();
  
  switch (command) {
    case 'init':
      if (!positional[0]) {
        console.error(COLOR.red('Error: Presentation name required'));
        process.exit(1);
      }
      createSamplePresentation(positional[0]);
      break;
      
    case 'serve':
      if (!positional[0]) {
        console.error(COLOR.red('Error: File path required'));
        process.exit(1);
      }
      servePresentation(positional[0], options.port);
      break;
      
    case 'export':
      if (!positional[0]) {
        console.error(COLOR.red('Error: File path required'));
        process.exit(1);
      }
      exportPresentation(positional[0], options.output);
      break;
      
    default:
      console.error(COLOR.red(`Unknown command: ${command}`));
      showHelp();
      process.exit(1);
  }
}

main();
