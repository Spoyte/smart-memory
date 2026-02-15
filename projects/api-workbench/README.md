# API Workbench

A lightweight, zero-dependency HTTP client for the terminal. Test APIs without leaving your command line.

## Why?

- `curl` is powerful but verbose and hard to remember
- Postman is heavy and GUI-only
- You want something fast that works over SSH

## Features

- ✅ Simple syntax: `apir GET https://api.example.com/users`
- ✅ JSON syntax highlighting
- ✅ Request history (last 100 requests)
- ✅ Save requests to collections
- ✅ Environment variables
- ✅ Zero dependencies (pure Node.js)
- ✅ Works on any platform

## Installation

```bash
# From project directory
npm link

# Or run directly
node src/cli.js GET https://api.example.com/users
```

## Quick Start

```bash
# Simple GET request
apir GET https://httpbin.org/get

# POST with JSON body
apir POST https://httpbin.org/post -d '{"name":"John","email":"john@example.com"}'

# With headers
apir GET https://api.example.com/protected -H "Authorization: Bearer token123"

# Save to collection
apir GET https://api.example.com/users -s myapi

# Use environment variable
apir env set API_URL https://api.example.com
apir GET {{API_URL}}/users
```

## Usage

```
apir [METHOD] <url> [options]

Methods:
  GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
  (default: GET)

Options:
  -H, --header <header>    Add request header (format: "Key: Value")
  -d, --data <data>        Request body (JSON string)
  -f, --file <path>        Read request body from file
  -t, --timeout <seconds>  Request timeout (default: 30)
  -v, --verbose            Show request details
  -s, --save <name>        Save request to collection
  -c, --collection <name>  Use saved collection
  --no-follow              Don't follow redirects
  -h, --help               Show help
```

## Examples

### Basic Requests

```bash
# GET request (default)
apir https://api.github.com/users/github

# Explicit method
apir DELETE https://api.example.com/users/123

# Custom headers
apir GET https://api.example.com/data \
  -H "Accept: application/json" \
  -H "Authorization: Bearer token"
```

### POST/PUT with Body

```bash
# Inline JSON
apir POST https://api.example.com/users \
  -d '{"name":"John","role":"admin"}'

# From file
apir POST https://api.example.com/users -f ./user.json

# Form data (as JSON)
apir POST https://api.example.com/upload \
  -H "Content-Type: multipart/form-data" \
  -d '{"file":"@image.png"}'
```

### Collections

```bash
# Save a request
apir GET https://api.example.com/users -s myproject
apir POST https://api.example.com/users -s myproject

# List collections
apir collections

# View collection
apir collections show myproject

# Delete collection
apir collections delete myproject
```

### Environment Variables

```bash
# Set variables
apir env set API_URL https://api.example.com
apir env set API_KEY secret_token_123

# Use in requests
apir GET {{API_URL}}/users -H "Authorization: Bearer {{API_KEY}}"

# List all variables
apir env

# Remove variable
apir env unset API_KEY
```

### History

```bash
# Show recent requests
apir history

# Replay request #3
apir replay 3

# Clear history
apir history clear
```

## Testing with Local Services

Test the betting tools:

```bash
# Test notify-router
apir POST http://localhost:3456/notify \
  -d '{"source":"test","priority":"high","title":"Test","message":"Hello"}'

# Test surebet-detector API
apir GET http://localhost:3000/api/opportunities

# Test webhook-inspector
apir POST http://localhost:8080/webhook/test \
  -H "X-Custom-Header: value" \
  -d '{"event":"user.created","id":123}'
```

## Configuration

All data is stored in `~/.api-workbench/`:
- `history.json` — Request history
- `env.json` — Environment variables
- `collections/` — Saved request collections

## Tips

1. **Verbose mode** (`-v`) shows full request and response headers
2. **Timeout** (`-t`) is in seconds (default: 30)
3. **Environment variables** use `{{VAR}}` or `${VAR}` syntax
4. **JSON bodies** are automatically detected and pretty-printed

## License

MIT

---

Built by Nemo 🐙
