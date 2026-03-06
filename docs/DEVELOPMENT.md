# TmpMail — Development Guide

## Requirements

| Tool | Version |
|---|---|
| Node.js | >= 18 |
| npm | >= 10 |
| Redis | 7.x |
| MongoDB | 7.x |
| Postfix | 3.x (production only) |

---

## Initial Setup

```bash
# 1. Clone and install dependencies
git clone <repo-url> tmpmail
cd tmpmail
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your values (DOMAINS, REDIS_URL, MONGO_URI, etc.)

# 3. Build the shared package (required before running apps)
npm run build --workspace=packages/shared
```

---

## Development

### Start everything at once (recommended)

```bash
npm run dev
```

This uses Turborepo to start both `frontend` (:3000) and `backend` (:4000) in parallel.

### Start services individually

```bash
# Frontend only (Next.js dev server)
npm run dev --workspace=apps/frontend

# Backend only (tsx watch — hot reload)
npm run dev --workspace=apps/backend
```

---

## Database

### Redis

```bash
# Start Redis (Linux/macOS)
redis-server

# Start Redis (Windows — WSL or Docker)
docker run -d -p 6379:6379 redis:7

# Check Redis is running
redis-cli ping
# Expected output: PONG

# Monitor keyspace events (useful for debugging mailbox expiry)
redis-cli monitor

# Manually inspect a mailbox
redis-cli hgetall mailbox:<mailboxId>

# Check TTL remaining
redis-cli ttl mailbox:<mailboxId>
```

### MongoDB

```bash
# Start MongoDB (Linux/macOS)
mongod --dbpath /var/lib/mongodb

# Start MongoDB (Docker)
docker run -d -p 27017:27017 --name mongo mongo:7

# Check MongoDB is running
mongosh --eval "db.adminCommand({ ping: 1 })"

# Open MongoDB shell
mongosh mongodb://localhost:27017/tmpmail

# Useful queries
db.mailboxes.find({ status: "active" })
db.emails.find({ mailboxId: "<id>" })
db.emails.countDocuments()
```

---

## Build

```bash
# Build everything (shared → frontend + backend in parallel)
npm run build

# Build individual packages
npm run build --workspace=packages/shared
npm run build --workspace=apps/frontend
npm run build --workspace=apps/backend
```

---

## Production

### Start with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start all processes
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Monitor
pm2 monit

# Restart a service
pm2 restart frontend
pm2 restart backend
pm2 restart mail-receiver

# Auto-start on system boot
pm2 startup
pm2 save
```

### ecosystem.config.js (create at project root)

```js
module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "./apps/frontend",
      script: "node",
      args: "server.js",
      env: { NODE_ENV: "production", PORT: 3000 }
    },
    {
      name: "backend",
      cwd: "./apps/backend",
      script: "dist/server.js",
      env: { NODE_ENV: "production" }
    },
    {
      name: "mail-receiver",
      cwd: "./apps/backend",
      script: "dist/mail-receiver.js",
      watch: false,
      env: { NODE_ENV: "production" }
    }
  ]
}
```

---

## Testing

```bash
# Run all tests
npm run test

# Run tests for a specific app
npm run test --workspace=apps/backend
npm run test --workspace=apps/frontend

# Run tests in watch mode
npx vitest --watch --project apps/backend

# Run E2E tests (requires backend + frontend running)
npx playwright test

# Load test (requires k6 installed)
k6 run tests/load/create-mailbox.js
```

---

## Type Checking & Linting

```bash
# Type check everything
npm run lint

# Type check individual app
npm run lint --workspace=apps/backend
npm run lint --workspace=apps/frontend

# Rebuild shared types (required after changing packages/shared)
npm run build --workspace=packages/shared
```

---

## Postfix Setup (Production VPS)

### Install Postfix

```bash
apt update && apt install -y postfix

# Select "Internet Site" during setup
# Set system mail name to your domain
```

### Configure catch-all

```bash
# /etc/postfix/main.cf
virtual_alias_domains = yourdomain.com domain2.com
virtual_alias_maps = regexp:/etc/postfix/virtual_regexp

# /etc/postfix/virtual_regexp
# Pipe all mail to the Node receiver script
/.+@yourdomain\.com/    tmpmail

# /etc/postfix/master.cf — add at the end:
tmpmail unix  -       n       n       -       -       pipe
  flags=Rq user=www-data argv=/usr/bin/node /app/dist/mail-receiver.js ${recipient}

# Reload Postfix
postmap /etc/postfix/virtual_regexp
systemctl reload postfix
```

### Test mail delivery

```bash
# Send a test email via SMTP
echo "Test body" | mail -s "Test subject" test@yourdomain.com

# Check Postfix logs
tail -f /var/log/mail.log
```

---

## Nginx Configuration (Production)

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Socket.io (must be before /)
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads (attachments)
    location /uploads/ {
        proxy_pass http://localhost:4000;
    }

    # Internal endpoint (block from public)
    location /internal/ {
        allow 127.0.0.1;
        deny all;
        proxy_pass http://localhost:4000;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `MONGO_URI` | `mongodb://localhost:27017/tmpmail` | MongoDB connection URI |
| `PORT` | `4000` | Backend server port |
| `DOMAINS` | — | Comma-separated list of mail domains |
| `MAILBOX_TTL` | `600` | Mailbox lifetime in seconds (10 min) |
| `MAILBOX_TTL_EXTEND` | `300` | Seconds added per received email |
| `RATE_LIMIT_WINDOW_MS` | `3600000` | Rate limit window (1 hour) |
| `RATE_LIMIT_MAX` | `10` | Max mailboxes per IP per window |
| `MAX_ATTACHMENT_SIZE` | `5242880` | Max attachment size in bytes (5 MB) |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Backend API URL (client-side) |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:4000` | Socket.io URL (client-side) |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `es` | Default language |

---

## Project Structure

```
tmpmail/
├── apps/
│   ├── frontend/          Next.js 14 — UI
│   └── backend/           Node.js + Express + Socket.io — API
├── packages/
│   └── shared/            Shared TypeScript types
├── docs/
│   ├── DEVELOPMENT.md     This file
│   └── plans/             Design documents
├── turbo.json             Turborepo pipeline config
├── .env.example           Environment variable template
└── package.json           Workspace root
```

---

## Common Issues

### `@tmpmail/shared` types not found after changing shared/

```bash
# Rebuild shared package
npm run build --workspace=packages/shared
```

### Redis keyspace notifications not firing

```bash
# Enable manually if config set fails
redis-cli config set notify-keyspace-events Ex
```

### Port already in use

```bash
# Find and kill process on port
npx kill-port 3000 4000
```

### MongoDB connection refused

```bash
# Check if mongod is running
systemctl status mongod
# or
ps aux | grep mongod
```
