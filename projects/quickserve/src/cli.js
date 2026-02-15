#!/usr/bin/env node

const { QuickServe, getLocalIP, generateQR } = require('./server');
const path = require('path');

function printUsage() {
  console.log(`
📤 QuickServe - Instant file sharing server

Usage:
  quickserve [options] [path]

Options:
  -p, --port <port>      Port to use (default: random available)
  --no-upload            Disable file upload
  -t, --timeout <min>   Auto-shutdown after N minutes of inactivity
  -h, --help            Show this help

Examples:
  quickserve                    # Share current directory
  quickserve ./documents        # Share specific folder
  quickserve -p 8080            # Use specific port
  quickserve --no-upload        # Share without upload support
  quickserve -t 30              # Auto-shutdown after 30 min idle
`);
}

function parseArgs(args) {
  const options = {
    port: 0,
    upload: true,
    autoShutdown: 0,
    rootDir: '.'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      printUsage();
      process.exit(0);
    } else if (arg === '-p' || arg === '--port') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--no-upload') {
      options.upload = false;
    } else if (arg === '-t' || arg === '--timeout') {
      options.autoShutdown = parseInt(args[++i], 10);
    } else if (!arg.startsWith('-')) {
      options.rootDir = arg;
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    printUsage();
    if (args.length === 0) {
      // Default behavior: share current directory
      console.log('\nSharing current directory...\n');
    } else {
      process.exit(0);
    }
  }

  const options = parseArgs(args);
  const server = new QuickServe(options);

  try {
    const port = await server.start();
    const ip = getLocalIP();
    const url = `http://${ip}:${port}`;

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🚀 QuickServe is running!                               ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  📁 Serving: ${path.resolve(options.rootDir).padEnd(45)}║`);
    console.log(`║  🌐 URL:     ${url.padEnd(45)}║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Scan QR code with your phone:                           ║');
    console.log('║                                                          ║');
    
    const qr = generateQR(url);
    qr.ascii.split('\n').forEach(line => {
      console.log('║  ' + line.padEnd(54) + '║');
    });
    
    console.log('║                                                          ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Features:                                               ║');
    console.log(`║  • Upload support: ${(options.upload ? '✅ enabled' : '❌ disabled').padEnd(38)}║`);
    if (options.autoShutdown > 0) {
      console.log(`║  • Auto-shutdown:  ${(`${options.autoShutdown} min idle`).padEnd(38)}║`);
    }
    console.log('║                                                          ║');
    console.log('║  Press Ctrl+C to stop                                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down...');
      server.stop();
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

main();
