const express = require('express');
const config = require('../config/default.json');
const db = require('./db');
const { ChannelManager } = require('./channels');

const app = express();
app.use(express.json());

const channels = new ChannelManager(config);
const rateLimitCache = new Map();

// Rate limiting middleware
function checkRateLimit(source) {
  const limitConfig = config.rateLimits[source] || config.rateLimits.default;
  const key = `${source}:${Math.floor(Date.now() / 3600000)}`; // Per hour bucket
  
  const current = rateLimitCache.get(key) || 0;
  if (current >= limitConfig.maxPerHour) {
    return false;
  }
  
  rateLimitCache.set(key, current + 1);
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Math.floor(Date.now() / 3600000);
  for (const key of rateLimitCache.keys()) {
    const hour = parseInt(key.split(':')[1]);
    if (hour < now - 1) {
      rateLimitCache.delete(key);
    }
  }
}, 60000);

// POST /notify - Submit a notification
app.post('/notify', async (req, res) => {
  try {
    const { source, priority = 'medium', title, message, data, channels: targetChannels } = req.body;

    // Validation
    if (!source || !title) {
      return res.status(400).json({ error: 'Missing required fields: source, title' });
    }

    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority. Use: low, medium, high, critical' });
    }

    // Check rate limit
    if (!checkRateLimit(source)) {
      return res.status(429).json({ error: 'Rate limit exceeded for this source' });
    }

    const notification = {
      source,
      priority,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      channels: targetChannels ? JSON.stringify(targetChannels) : null,
      delivered_to: null
    };

    // Store in database
    const result = await db.insert(notification);
    const notificationId = result.lastInsertRowid;

    // Send to channels
    const { results, deliveredTo } = await channels.send({
      ...req.body,
      id: notificationId
    });

    // Update delivery status
    await db.updateDelivered({
      id: notificationId,
      delivered_to: deliveredTo.join(',')
    });

    res.json({
      success: true,
      id: notificationId,
      deliveredTo,
      channelResults: results
    });

  } catch (err) {
    console.error('Error processing notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /history - Get recent notifications
app.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const source = req.query.source;

    let rows;
    if (source) {
      rows = await db.getBySource({ source, limit });
    } else {
      rows = await db.getRecent({ limit });
    }

    // Parse JSON fields
    const notifications = rows.map(row => ({
      ...row,
      data: row.data ? JSON.parse(row.data) : null,
      channels: row.channels ? JSON.parse(row.channels) : null
    }));

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /config - View current configuration (without sensitive data)
app.get('/config', (req, res) => {
  const safeConfig = {
    port: config.port,
    channels: Object.fromEntries(
      Object.entries(config.channels).map(([name, cfg]) => [
        name,
        { enabled: cfg.enabled, minPriority: cfg.minPriority }
      ])
    ),
    quietHours: config.quietHours,
    rateLimits: config.rateLimits,
    priorities: config.priorities
  };
  res.json(safeConfig);
});

// GET /health - Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = config.port || 3456;
app.listen(PORT, () => {
  console.log(`🔔 Notify Router running on port ${PORT}`);
  console.log(`   Channels: ${Array.from(channels.channels.keys()).join(', ') || 'none'}`);
  console.log(`   Quiet hours: ${config.quietHours.enabled ? `${config.quietHours.start}-${config.quietHours.end}` : 'disabled'}`);
});

module.exports = app;
