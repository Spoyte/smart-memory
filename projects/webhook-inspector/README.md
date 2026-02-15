# 🔍 Webhook Inspector

Self-hosted webhook debugging tool — like RequestBin, but it runs on your machine.

## What It Does

Webhook Inspector creates unique HTTP endpoints that capture and display incoming requests. Perfect for:

- Debugging webhooks from Stripe, GitHub, Slack, etc.
- Testing API integrations
- Inspecting HTTP callbacks
- Learning how webhooks work

## Features

- ✅ **Zero dependencies** — Pure Node.js, no npm install needed
- ✅ **Unique endpoints** — Auto-generated bin IDs for isolation
- ✅ **Real-time capture** — See requests as they arrive
- ✅ **Full request details** — Headers, body, query params, timestamps
- ✅ **JSON pretty-printing** — Automatic formatting of JSON bodies
- ✅ **Clean web UI** — Dark mode, responsive design
- ✅ **API endpoints** — Programmatic access to bins and requests

## Quick Start

```bash
# Start the server
node server.js

# Or specify a port
node server.js 8080
```

Then open http://localhost:7777 in your browser.

## How to Use

1. **Create a Bin** — Click "Create Bin" to generate a unique endpoint
2. **Send Requests** — POST/GET/PUT to your bin's `/receive` URL
3. **Inspect** — View captured requests in the web UI

### Example

```bash
# Create a bin (via web UI), then send requests:
curl -X POST http://localhost:7777/bin/abc123.../receive \
  -H "Content-Type: application/json" \
  -d '{"event": "payment.success"}'
```

## API

### Create Bin
```bash
POST /create
# Redirects to /bin/{binId}
```

### Receive Webhook
```bash
ANY /bin/{binId}/receive
ANY /bin/{binId}/receive/*
# Captures any HTTP method and path
```

### List Bins
```bash
GET /api/bins
```

### Get Bin Details
```bash
GET /api/bin/{binId}
```

## Use Cases

| Scenario | How to Use |
|----------|------------|
| Stripe webhooks | Point Stripe to your bin URL, inspect payloads |
| GitHub webhooks | Test push events locally |
| Slack callbacks | Debug interactive components |
| API testing | Send requests from your app, verify structure |
| Learning | See exactly what webhooks send |

## Storage

All data is stored in memory. Bins and requests disappear when the server restarts. This is by design — it's a debugging tool, not a database.

## License

MIT
