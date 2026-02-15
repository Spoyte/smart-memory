/**
 * System Pulse - TUI (Terminal User Interface)
 * Clean, minimal display with sparklines
 */

const SystemPulse = require('./pulse');

class TUI {
  constructor() {
    this.pulse = new SystemPulse();
    this.running = false;
    this.history = [];
    this.maxHistoryPoints = 60; // Last 60 readings for sparklines
  }

  /**
   * Clear screen
   */
  clear() {
    process.stdout.write('\x1b[2J\x1b[0f');
  }

  /**
   * Move cursor to position
   */
  moveTo(x, y) {
    process.stdout.write(`\x1b[${y};${x}H`);
  }

  /**
   * Hide cursor
   */
  hideCursor() {
    process.stdout.write('\x1b[?25l');
  }

  /**
   * Show cursor
   */
  showCursor() {
    process.stdout.write('\x1b[?25h');
  }

  /**
   * Get color code based on percentage
   */
  getColor(percent) {
    if (percent < 50) return '\x1b[32m'; // Green
    if (percent < 80) return '\x1b[33m'; // Yellow
    return '\x1b[31m'; // Red
  }

  /**
   * Reset color
   */
  resetColor() {
    return '\x1b[0m';
  }

  /**
   * Draw a simple bar
   */
  drawBar(percent, width = 20) {
    const filled = Math.floor((percent / 100) * width);
    const empty = width - filled;
    const color = this.getColor(percent);
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${color}${bar}${this.resetColor()}`;
  }

  /**
   * Draw a sparkline
   */
  drawSparkline(values, width = 40, height = 4) {
    if (values.length === 0) return '';
    
    const max = Math.max(...values, 100);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const step = Math.max(1, Math.floor(values.length / width));
    
    let line = '';
    for (let i = 0; i < values.length; i += step) {
      const normalized = (values[i] - min) / range;
      const blockIndex = Math.floor(normalized * (blocks.length - 1));
      line += blocks[blockIndex];
    }
    
    return line.padEnd(width, ' ');
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const gb = bytes / 1024 / 1024 / 1024;
    return `${gb.toFixed(2)} GB`;
  }

  /**
   * Render the TUI
   */
  render() {
    const metrics = this.pulse.collectMetrics();
    
    // Add to history
    this.history.push(metrics);
    if (this.history.length > this.maxHistoryPoints) {
      this.history.shift();
    }

    this.clear();
    
    // Header
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    ⚡ SYSTEM PULSE ⚡                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    // CPU Section
    const cpuColor = this.getColor(metrics.cpu);
    console.log(`║  CPU Usage                                                    ║`);
    console.log(`║  ${this.drawBar(metrics.cpu, 30)} ${cpuColor}${metrics.cpu.toString().padStart(3)}%${this.resetColor()}                ║`);
    
    // CPU Sparkline
    const cpuHistory = this.history.map(h => h.cpu);
    console.log(`║  ${this.drawSparkline(cpuHistory, 50)}        ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    // Memory Section
    const memColor = this.getColor(metrics.memory.percent);
    console.log(`║  Memory Usage                                                 ║`);
    console.log(`║  ${this.drawBar(metrics.memory.percent, 30)} ${memColor}${metrics.memory.percent.toString().padStart(3)}%${this.resetColor()}                ║`);
    console.log(`║  Used: ${metrics.memory.usedGB} GB / ${metrics.memory.totalGB} GB                                    ║`);
    
    // Memory Sparkline
    const memHistory = this.history.map(h => h.memory.percent);
    console.log(`║  ${this.drawSparkline(memHistory, 50)}        ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    // Disk Section
    const diskColor = this.getColor(metrics.disk.percent);
    console.log(`║  Disk Usage                                                   ║`);
    console.log(`║  ${this.drawBar(metrics.disk.percent, 30)} ${diskColor}${metrics.disk.percent.toString().padStart(3)}%${this.resetColor()}                ║`);
    console.log(`║  Used: ${metrics.disk.usedGB} GB / ${metrics.disk.totalGB} GB                                    ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    // Load Average
    console.log(`║  Load Average: ${metrics.load['1m']} (1m) | ${metrics.load['5m']} (5m) | ${metrics.load['15m']} (15m)                    ║`);
    console.log(`║  Uptime: ${metrics.uptime.padEnd(50)}║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    
    // Footer
    console.log('║  Press Ctrl+C to exit | Data saved to ~/.system-pulse/       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
  }

  /**
   * Start the TUI
   */
  start() {
    this.running = true;
    this.hideCursor();
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      this.stop();
    });

    // Initial render
    this.render();
    
    // Save initial metrics
    const metrics = this.pulse.collectMetrics();
    this.pulse.saveMetrics(metrics);

    // Update loop (every 2 seconds)
    this.interval = setInterval(() => {
      if (!this.running) return;
      
      const metrics = this.pulse.collectMetrics();
      this.pulse.saveMetrics(metrics);
      this.render();
    }, 2000);
  }

  /**
   * Stop the TUI
   */
  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.showCursor();
    this.clear();
    console.log('System Pulse stopped. Data saved to ~/.system-pulse/');
    process.exit(0);
  }
}

module.exports = TUI;
