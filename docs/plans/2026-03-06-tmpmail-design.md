# TmpMail — Design Document
**Date:** 2026-03-06
**Status:** Approved

---

## Decisions Summary

| Aspect | Decision |
|---|---|
| MVP scope | Full functionality from day one |
| Infrastructure | VPS ready (Ubuntu 22.04 LTS — Hetzner) |
| Domains | 2-5 owned domains in selector |
| Languages | Spanish + English (real i18n with next-intl) |
| Monetization | Alternative ad network (not AdSense) |
| PWA | Full: manifest + service worker + offline support |
| Architecture | Monorepo with Turborepo |

---

## Section 1: Architecture

### Monorepo Structure

```
tmpmail/
├── apps/
│   ├── frontend/          # Next.js 14 (App Router)
│   └── backend/           # Node.js + Express + Socket.io
├── packages/
│   └── shared/            # Shared TypeScript types
│       ├── types/
│       │   ├── mailbox.ts
│       │   └── email.ts
│       ├── events/
│       │   └── socket.ts
│       └── config/
│           └── domains.ts
├── turbo.json
├── package.json
└── .env.example
```

### VPS Infrastructure Flow

```
Internet → Cloudflare (CDN + SSL)
                |
         +------+------+
         |             |
    Port 80/443    Port 25 (SMTP)
    Nginx (proxy)   Postfix (catch-all)
         |                |
    +----+----+      Node script
    |         |      (mailparser)
  :3000     :4000        |
 Next.js   Express <-----+
              |
         +----+----+
       Redis    MongoDB
    (active    (email
    mailboxes)  logs)
```

### Key Architecture Decisions

- **Postfix** receives all mail for domains (catch-all) and pipes to a Node script that parses and publishes to Redis + emits Socket.io event
- **Redis** stores active mailboxes with native 10-min TTL — expiration is automatic
- **MongoDB** stores full email content for the viewer (Redis only holds headers for inbox list)
- **Nginx** reverse proxies to Next.js (:3000) and Express (:4000), with WebSocket upgrade support for Socket.io
- **PM2** manages both Node processes with auto-restart
- **Turborepo** builds `shared` first, then `frontend` and `backend` in parallel

---

## Section 2: Frontend

### Component Tree

```
app/
├── [locale]/                    # next-intl routing (es/en)
│   ├── layout.tsx               # Providers: Theme, Socket, Zustand, i18n
│   └── page.tsx                 # Assembles all sections

components/
├── Hero/
│   ├── EmailDisplay.tsx         # Address with typing effect + JetBrains Mono
│   ├── CopyButton.tsx           # Animated checkmark with Framer Motion
│   └── Toolbar.tsx              # New | Domain | QR | Delete
├── Timer/
│   └── ExpirationTimer.tsx      # Animated SVG circle, shows mm:ss
├── Inbox/
│   ├── InboxPanel.tsx           # List + push notifications toggle
│   ├── EmailCard.tsx            # Card with slide-in, sender, subject, relative time
│   └── SkeletonLoader.tsx       # Animated bars "Waiting for emails..."
├── EmailViewer/
│   └── EmailModal.tsx           # Modal: sanitized HTML (DOMPurify) | plain text | attachments
├── DomainSelector/
│   └── DomainDropdown.tsx       # Dropdown with 2-5 available domains
├── AdSlot/
│   └── AdSlot.tsx               # Generic component: accepts size + network script
├── FAQ/
│   └── FAQAccordion.tsx         # 6 questions, FAQ JSON-LD schema included
├── Footer/
│   └── Footer.tsx               # Logo, links, language selector
└── ui/
    ├── ThemeToggle.tsx           # Dark/Light with next-themes
    └── QRModal.tsx               # Modal with qrcode.react
```

### Global State (Zustand)

```typescript
interface MailboxStore {
  mailboxId: string
  address: string
  expiresAt: Date
  emails: EmailHeader[]
  selectedEmail: Email | null
  isConnected: boolean
  // Actions
  createMailbox: () => Promise<void>
  deleteMailbox: () => Promise<void>
  selectEmail: (id: string) => void
  addIncomingEmail: (email: EmailHeader) => void
  extendExpiration: () => void  // +5 min on email received
}
```

### i18n (next-intl)

- Routing: `/es` (default) and `/en`
- Files: `messages/es.json` and `messages/en.json`
- Language selector in footer changes route while preserving mailbox state

### PWA

- `manifest.json` with name, icons, `theme_color: #6C63FF`, `display: standalone`
- Service Worker with Workbox: caches static assets, fonts, and app shell
- Offline: shows UI with "No connection — reconnecting..." message without losing active mailbox state

---

## Section 3: Backend

### REST API

```
POST   /api/mailbox/create          -> Generate unique ID, random address, save in Redis with TTL 600s
DELETE /api/mailbox/:id             -> Delete from Redis + MongoDB + emit mailbox_deleted
GET    /api/mailbox/:id/emails      -> List EmailHeaders from MongoDB (for page reload only)
GET    /api/email/:emailId          -> Full email content from MongoDB
GET    /api/domains                 -> Available domains list (from static config)
```

### Socket.io Events

```typescript
// Client -> Server
join_mailbox   { mailboxId }   // Subscribe to room
leave_mailbox  { mailboxId }   // Unsubscribe

// Server -> Client
new_email      { email }       // New email received -> slide-in + sound
mailbox_expired { mailboxId }  // Redis TTL expired -> UI shows "Expired"
mailbox_deleted { mailboxId }  // Manual delete -> redirect to new mailbox
```

### Mail Pipeline

```
Incoming SMTP
      |
Postfix catch-all (virtual_alias: @domain -> pipe)
      |
mail-receiver.ts (independent Node process)
      |
mailparser -> extracts from, subject, html, text, attachments
      |
  +---+------------------------+
  |                            |
Redis HSET                  MongoDB Email.save()
(headers for inbox)         (full content)
  |
Socket.io emit -> new_email -> only to mailboxId room
```

### Business Logic

| Rule | Implementation |
|---|---|
| Mailbox lasts 10 min | Redis TTL = 600s native |
| +5 min per email received | `EXPIRE mailboxId 300` on receive (adds to current TTL) |
| MongoDB cleanup | Cron every 5 min deletes docs with `expiresAt < now` |
| Rate limiting | `express-rate-limit`: 10 mailboxes/IP/hour on `POST /create` |
| Expiration detected | Redis Keyspace Notifications -> `expired` event -> Socket.io emit |
| Max attachments | 5MB per email, stored on VPS disk at `/uploads/` |

### Security

- `Helmet.js` on all endpoints
- CORS only for own domain (configurable via `.env`)
- IPs never stored (rate limiting only counts, never saves)
- Email HTML sanitized on **frontend** with DOMPurify before rendering
- Sensitive vars: `REDIS_URL`, `MONGO_URI`, `DOMAINS`, `RATE_LIMIT_MAX` in `.env`

---

## Section 4: Infrastructure & Deployment

### VPS Setup Order

```
1. Ubuntu 22.04 — update + ufw (ports 22, 80, 443, 25)
2. Node.js 20 LTS + npm
3. Redis 7          -> systemd service
4. MongoDB 7        -> systemd service
5. Postfix          -> catch-all for @domain.com
6. Nginx            -> reverse proxy + WebSocket upgrade
7. Certbot          -> SSL Let's Encrypt (or Cloudflare proxy)
8. PM2              -> manages frontend (:3000) and backend (:4000)
9. Turborepo build  -> generates dist for both apps
```

### Nginx Key Config

```nginx
# WebSocket support for Socket.io
location /socket.io/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}

# API proxy
location /api/ {
    proxy_pass http://localhost:4000;
}

# Next.js frontend
location / {
    proxy_pass http://localhost:3000;
}
```

### PM2 ecosystem.config.js

```javascript
module.exports = {
  apps: [
    { name: "frontend",      cwd: "./apps/frontend",  script: "node", args: "server.js" },
    { name: "backend",       cwd: "./apps/backend",   script: "dist/server.js" },
    { name: "mail-receiver", script: "dist/mail-receiver.js", watch: false }
  ]
}
```

### Cloudflare

- DNS pointing to VPS (orange proxy enabled)
- SSL mode: **Full (strict)**
- Firewall rule: block port 25 except from legitimate mail server IPs
- Cache: static assets only, **bypass** on `/api/` and `/socket.io/`

### Domains (2-5)

Register 2-5 short domains on Namecheap/Cloudflare Registrar. All point to same VPS. Postfix configured as catch-all on each. List defined in `packages/shared/config/domains.ts` and loaded via env var.

---

## Section 5: Testing & SEO

### Testing

| Layer | Tool | What it covers |
|---|---|---|
| Unit (backend) | Vitest | mailboxService, emailService, cleanupService |
| Unit (frontend) | Vitest + Testing Library | hooks: useSocket, useMailbox, useClipboard |
| Integration | Supertest | All REST endpoints |
| E2E | Playwright | Full flow: create mailbox -> receive email -> open viewer |
| Socket.io | socket.io-client in tests | join_mailbox, new_email, mailbox_expired |
| Load (basic) | k6 | 100 concurrent users on POST /create |

### SEO

**Meta tags in `layout.tsx`:**
```typescript
export const metadata = {
  title: "TmpMail — Correo Temporal Gratis",
  description: "Crea un correo desechable en segundos...",
  openGraph: { images: ["/og-image.png"] },
  alternates: {
    canonical: "https://yourdomain.com",
    languages: { en: "/en", es: "/es" }
  }
}
```

**Static files:**
- `sitemap.xml` — generated with `next-sitemap` at build time
- `robots.txt` — allow all except `/api/`
- `llms.txt` — for AI search visibility (basic GEO)

**JSON-LD Schema:**
- `FAQPage` in `FAQAccordion.tsx`
- `WebApplication` in global layout

**Performance (Core Web Vitals):**
- Fonts with `next/font` (zero layout shift)
- Images with `next/image`
- Ad slots with `loading="lazy"` and fixed dimensions to prevent CLS
