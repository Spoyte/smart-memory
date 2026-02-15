#!/usr/bin/env node
/**
 * System Pulse - CLI Entry Point
 */

const SystemPulse = require('./pulse');
const TUI = require('./tui');

const args = process.argv.slice(2);
const command = args[0];

const pulse = new SystemPulse();

function showHelp() {
  console.log(`
⚡ System Pulse - Lightweight system monitor with history

Usage:
  system-pulse                    Start the TUI monitor
  system-pulse status             Show current status (one-shot)
  system-pulse stats [hours]      Show statistics for period (default: 24h)
  system-pulse collect            Collect and save a single data point
  system-pulse export             Export data to file
  system-pulse help               Show this help

Export Options:
  system-pulse export --format csv --hours 24 --output stats.csv
  system-pulse export --format json --hours 12 --output stats.json

Examples:
  system-pulse                    # Start live monitoring
  system-pulse stats 1            # Show last hour stats
  system-pulse export --format csv  # Export to CSV
`);
}

function showStatus() {
  const metrics = pulse.collectMetrics();
  
  console.log('\n⚡ System Status');
  console.log('═══════════════════════════════════════');
  console.log(`CPU Usage:     ${metrics.cpu}%`);
  console.log(`Memory:        ${metrics.memory.percent}% (${metrics.memory.usedGB} GB / ${metrics.memory.totalGB} GB)`);
  console.log(`Disk:          ${metrics.disk.percent}% (${metrics.disk.usedGB} GB / ${metrics.disk.totalGB} GB)`);
  console.log(`Load Average:  ${metrics.load['1m']} / ${metrics.load['5m']} / ${metrics.load['15m']}`);
  console.log(`Uptime:        ${metrics.uptime}`);
  console.log('═══════════════════════════════════════\n');
}

function showStats(hours = 24) {
  const stats = pulse.getStats(hours);
  
  if (!stats) {
    console.log(`No data available for the last ${hours} hours.`);
    console.log('Run "system-pulse" to start collecting data.');
    return;
  }
  
  console.log(`\n📊 System Statistics (Last ${stats.period})`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`Samples: ${stats.samples}`);
  console.log('───────────────────────────────────────────────────');
  console.log(`CPU Usage:     Avg: ${stats.cpu.avg}% | Min: ${stats.cpu.min}% | Max: ${stats.cpu.max}%`);
  console.log(`Memory Usage:  Avg: ${stats.memory.avg}% | Min: ${stats.memory.min}% | Max: ${stats.memory.max}%`);
  console.log('───────────────────────────────────────────────────');
  console.log(`Current CPU:   ${stats.current.cpu}%`);
  console.log(`Current Mem:   ${stats.current.memory.percent}%`);
  console.log('═══════════════════════════════════════════════════\n');
}

function collectData() {
  const metrics = pulse.collectMetrics();
  pulse.saveMetrics(metrics);
  console.log(`✓ Data collected at ${new Date().toISOString()}`);
}

function exportData() {
  const formatIndex = args.indexOf('--format');
  const hoursIndex = args.indexOf('--hours');
  const outputIndex = args.indexOf('--output');
  
  const format = formatIndex > -1 ? args[formatIndex + 1] : 'csv';
  const hours = hoursIndex > -1 ? parseInt(args[hoursIndex + 1]) : 24;
  const output = outputIndex > -1 ? args[outputIndex + 1] : null;
  
  if (format === 'csv') {
    const csv = pulse.exportToCSV(hours, output);
    if (csv) {
      if (output) {
        console.log(`✓ Exported to ${output}`);
      } else {
        console.log(csv);
      }
    } else {
      console.log('No data available to export.');
    }
  } else if (format === 'json') {
    const json = pulse.exportToJSON(hours, output);
    if (json) {
      if (output) {
        console.log(`✓ Exported to ${output}`);
      } else {
        console.log(json);
      }
    } else {
      console.log('No data available to export.');
    }
  } else {
    console.log(`Unknown format: ${format}. Use 'csv' or 'json'.`);
  }
}

// Route commands
switch (command) {
  case undefined:
  case 'monitor':
    // Start TUI
    const tui = new TUI();
    tui.start();
    break;
    
  case 'status':
    showStatus();
    break;
    
  case 'stats':
    const hours = args[1] ? parseInt(args[1]) : 24;
    showStats(hours);
    break;
    
  case 'collect':
    collectData();
    break;
    
  case 'export':
    exportData();
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Run "system-pulse help" for usage information.');
    process.exit(1);
}
