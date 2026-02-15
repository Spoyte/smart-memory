/**
 * System Pulse - Core monitoring functionality
 * Collects system metrics: CPU, memory, disk usage
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SystemPulse {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(os.homedir(), '.system-pulse');
    this.dbPath = path.join(this.dataDir, 'metrics.db');
    this.maxHistoryHours = options.maxHistoryHours || 24;
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Previous CPU times for calculating usage percentage
    this.prevCpuTimes = null;
  }

  /**
   * Get current CPU usage percentage
   */
  getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const currentTimes = { idle: totalIdle, total: totalTick };

    if (!this.prevCpuTimes) {
      this.prevCpuTimes = currentTimes;
      return 0; // First reading
    }

    const idleDiff = currentTimes.idle - this.prevCpuTimes.idle;
    const totalDiff = currentTimes.total - this.prevCpuTimes.total;
    const usagePercent = 100 - Math.floor((100 * idleDiff) / totalDiff);

    this.prevCpuTimes = currentTimes;
    return usagePercent;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percent = Math.floor((used / total) * 100);

    return {
      total,
      free,
      used,
      percent,
      totalGB: (total / 1024 / 1024 / 1024).toFixed(2),
      usedGB: (used / 1024 / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Get disk usage for root filesystem
   */
  getDiskUsage() {
    try {
      // Read disk stats from /proc/diskstats (Linux)
      const stats = fs.readFileSync('/proc/diskstats', 'utf8');
      
      // For simplicity, try to get df output
      const { execSync } = require('child_process');
      const df = execSync('df -k /', { encoding: 'utf8' });
      const lines = df.trim().split('\n');
      
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        const total = parseInt(parts[1]) * 1024; // Convert KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const available = parseInt(parts[3]) * 1024;
        const percent = parseInt(parts[4].replace('%', ''));
        
        return {
          total,
          used,
          available,
          percent,
          totalGB: (total / 1024 / 1024 / 1024).toFixed(2),
          usedGB: (used / 1024 / 1024 / 1024).toFixed(2)
        };
      }
    } catch (e) {
      // Fallback: return zeros
    }
    
    return { total: 0, used: 0, available: 0, percent: 0, totalGB: '0.00', usedGB: '0.00' };
  }

  /**
   * Get load averages
   */
  getLoadAverage() {
    const load = os.loadavg();
    return {
      '1m': load[0].toFixed(2),
      '5m': load[1].toFixed(2),
      '15m': load[2].toFixed(2)
    };
  }

  /**
   * Get uptime in human-readable format
   */
  getUptime() {
    const seconds = os.uptime();
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  /**
   * Collect all metrics in one call
   */
  collectMetrics() {
    return {
      timestamp: Date.now(),
      cpu: this.getCpuUsage(),
      memory: this.getMemoryUsage(),
      disk: this.getDiskUsage(),
      load: this.getLoadAverage(),
      uptime: this.getUptime()
    };
  }

  /**
   * Initialize the SQLite database
   */
  initDatabase() {
    // Simple JSON-based storage for zero-dependency version
    const schema = {
      metrics: []
    };
    
    if (!fs.existsSync(this.dbPath)) {
      fs.writeFileSync(this.dbPath, JSON.stringify(schema));
    }
  }

  /**
   * Save metrics to database
   */
  saveMetrics(metrics) {
    this.initDatabase();
    
    const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
    data.metrics.push(metrics);
    
    // Keep only last 24 hours of data (assuming 1-minute intervals = 1440 records)
    const maxRecords = this.maxHistoryHours * 60;
    if (data.metrics.length > maxRecords) {
      data.metrics = data.metrics.slice(-maxRecords);
    }
    
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }

  /**
   * Get historical metrics
   */
  getHistory(hours = 1) {
    if (!fs.existsSync(this.dbPath)) {
      return [];
    }
    
    const data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    return data.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get stats summary
   */
  getStats(hours = 24) {
    const history = this.getHistory(hours);
    
    if (history.length === 0) {
      return null;
    }

    const cpuValues = history.map(h => h.cpu);
    const memValues = history.map(h => h.memory.percent);
    
    const avg = arr => Math.floor(arr.reduce((a, b) => a + b, 0) / arr.length);
    const max = arr => Math.max(...arr);
    const min = arr => Math.min(...arr);

    return {
      period: `${hours}h`,
      samples: history.length,
      cpu: { avg: avg(cpuValues), min: min(cpuValues), max: max(cpuValues) },
      memory: { avg: avg(memValues), min: min(memValues), max: max(memValues) },
      current: history[history.length - 1]
    };
  }

  /**
   * Export data to CSV
   */
  exportToCSV(hours = 24, outputPath) {
    const history = this.getHistory(hours);
    
    if (history.length === 0) {
      return null;
    }

    const headers = 'timestamp,cpu_percent,memory_percent,memory_used_gb,disk_percent,load_1m\n';
    const rows = history.map(h => {
      const date = new Date(h.timestamp).toISOString();
      return `${date},${h.cpu},${h.memory.percent},${h.memory.usedGB},${h.disk.percent},${h.load['1m']}`;
    }).join('\n');

    const csv = headers + rows;
    
    if (outputPath) {
      fs.writeFileSync(outputPath, csv);
    }
    
    return csv;
  }

  /**
   * Export data to JSON
   */
  exportToJSON(hours = 24, outputPath) {
    const history = this.getHistory(hours);
    const json = JSON.stringify(history, null, 2);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, json);
    }
    
    return json;
  }
}

module.exports = SystemPulse;
