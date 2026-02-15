const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ChannelManager {
  constructor(config) {
    this.config = config;
    this.channels = new Map();
    
    if (config.channels.telegram?.enabled) {
      this.channels.set('telegram', new TelegramChannel(config.channels.telegram));
    }
    if (config.channels.file?.enabled) {
      this.channels.set('file', new FileChannel(config.channels.file));
    }
    if (config.channels.console?.enabled) {
      this.channels.set('console', new ConsoleChannel(config.channels.console));
    }
  }

  async send(notification) {
    const results = [];
    const deliveredTo = [];

    for (const [name, channel] of this.channels) {
      // Check if notification specifies specific channels
      if (notification.channels && !notification.channels.includes(name)) {
        continue;
      }

      // Check priority threshold
      const priorityLevel = this.config.priorities[notification.priority] || 1;
      const minPriorityLevel = this.config.priorities[channel.config.minPriority] || 1;
      
      if (priorityLevel < minPriorityLevel) {
        continue;
      }

      // Check quiet hours
      if (this.isQuietHours() && name === 'telegram' && notification.priority !== 'critical') {
        continue;
      }

      try {
        await channel.send(notification);
        deliveredTo.push(name);
        results.push({ channel: name, success: true });
      } catch (err) {
        results.push({ channel: name, success: false, error: err.message });
      }
    }

    return { results, deliveredTo };
  }

  isQuietHours() {
    if (!this.config.quietHours?.enabled) return false;
    
    const now = new Date();
    const tz = this.config.quietHours.timezone || 'UTC';
    
    // Simple quiet hours check (can be improved with proper timezone handling)
    const [startHour, startMin] = this.config.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.config.quietHours.end.split(':').map(Number);
    
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight quiet hours (e.g., 23:00 - 08:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  }
}

class TelegramChannel {
  constructor(config) {
    this.config = config;
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  async send(notification) {
    if (!this.config.botToken || !this.config.chatId) {
      throw new Error('Telegram not configured');
    }

    const emoji = {
      low: 'ℹ️',
      medium: '⚡',
      high: '🔥',
      critical: '🚨'
    }[notification.priority] || 'ℹ️';

    const text = `${emoji} *${notification.title}*\n\n${notification.message}`;

    await axios.post(`${this.baseUrl}/sendMessage`, {
      chat_id: this.config.chatId,
      text: text,
      parse_mode: 'Markdown'
    });
  }
}

class FileChannel {
  constructor(config) {
    this.config = config;
    this.filePath = path.resolve(config.path);
    
    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async send(notification) {
    const line = JSON.stringify({
      ...notification,
      timestamp: new Date().toISOString()
    }) + '\n';
    
    fs.appendFileSync(this.filePath, line);
  }
}

class ConsoleChannel {
  constructor(config) {
    this.config = config;
    this.colors = {
      reset: '\x1b[0m',
      dim: '\x1b[2m',
      low: '\x1b[36m',     // Cyan
      medium: '\x1b[32m',  // Green
      high: '\x1b[33m',    // Yellow
      critical: '\x1b[31m' // Red
    };
  }

  async send(notification) {
    if (!this.config.colors) {
      console.log(`[${notification.priority.toUpperCase()}] ${notification.source}: ${notification.title}`);
      return;
    }

    const color = this.colors[notification.priority] || this.colors.reset;
    const emoji = {
      low: 'ℹ️',
      medium: '⚡',
      high: '🔥',
      critical: '🚨'
    }[notification.priority] || 'ℹ️';

    console.log(`${color}${emoji} [${notification.priority.toUpperCase()}] ${notification.source}${this.colors.reset}`);
    console.log(`   ${notification.title}`);
    if (notification.message) {
      console.log(`   ${this.colors.dim}${notification.message}${this.colors.reset}`);
    }
    console.log();
  }
}

module.exports = { ChannelManager };
