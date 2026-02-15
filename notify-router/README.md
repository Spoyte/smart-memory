# Notify Router

Smart notification routing system that delivers alerts to the right channel based on urgency and context.

## Problem

- Too many notifications from different sources
- High-value alerts get lost in routine noise
- No unified way to manage alert preferences

## Solution

A centralized router that:
1. Receives notifications from any source (HTTP, file, stdin)
2. Scores urgency based on content/rules
3. Routes to appropriate channel (Telegram, file, stdout)
4. Respects user preferences (quiet hours, rate limits)

## Features

- [x] HTTP API for receiving notifications
- [x] Priority-based routing (low/medium/high/critical)
- [x] Multiple channels (Telegram, file, stdout)
- [x] Quiet hours support
- [x] Rate limiting per source
- [x] SQLite persistence
- [ ] Web dashboard for history
- [ ] Rule-based filtering
- [ ] Alert aggregation (batch similar alerts)

## Quick Start

```bash
npm install
npm start
```

Send a notification:
```bash
curl -X POST http://localhost:3456/notify \
  -H "Content-Type: application/json" \
  -d '{
    "source": "surebet-detector",
    "priority": "high",
    "title": "Arbitrage Opportunity",
    "message": "Tennis match: 3.2% profit detected",
    "data": { "sport": "tennis", "profit": 3.2 }
  }'
```

## API

### POST /notify
Submit a notification for routing.

```json
{
  "source": "string",      // Required: identifier for the source
  "priority": "low|medium|high|critical",
  "title": "string",       // Short summary
  "message": "string",     // Full message
  "data": {},              // Optional: structured data
  "channels": ["telegram"] // Optional: force specific channels
}
```

### GET /history
Get recent notifications.

### GET /config
View current routing configuration.

### GET /health
Health check.

## Configuration

Edit `config/default.json`:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "YOUR_BOT_TOKEN",
      "chatId": "YOUR_CHAT_ID",
      "minPriority": "medium"
    },
    "file": {
      "enabled": true,
      "path": "./data/notifications.jsonl",
      "minPriority": "low"
    }
  },
  "quietHours": {
    "enabled": true,
    "start": "23:00",
    "end": "08:00"
  },
  "rateLimits": {
    "surebet-detector": { "maxPerHour": 10 }
  }
}
```

## Client Library

```javascript
const notify = require('./notify-router/client');

// Simple usage
await notify({
  source: 'my-app',
  priority: 'high',
  title: 'Something happened',
  message: 'Details here'
});

// Convenience methods
await notify.low('my-app', 'Info', 'Just FYI');
await notify.high('my-app', 'Warning', 'Pay attention!');
await notify.critical('my-app', 'ALERT', 'Action required!');
```

## Integration with Existing Projects

### Surebet Detector
```javascript
const notify = require('../notify-router/client');

// In your opportunity detection code
if (profit > threshold) {
  await notify({
    source: 'surebet-detector',
    priority: profit > 5 ? 'critical' : 'high',
    title: `Arbitrage: ${profit}%`,
    message: `Found ${profit}% profit on ${match}`,
    data: { match, profit, bookmakers }
  });
}
```

### Promo Scanner
```javascript
await notify({
  source: 'promo-scanner',
  priority: ev > 10 ? 'high' : 'medium',
  title: `+EV Promotion: ${ev}%`,
  message: `${bookmaker}: ${description}`,
  data: { bookmaker, ev, description }
});
```

## Testing

```bash
./test.sh
```

## Tech Stack

- Node.js + Express
- SQLite for persistence
- Axios for Telegram integration

---

Built by Nemo for Noé 🐙
