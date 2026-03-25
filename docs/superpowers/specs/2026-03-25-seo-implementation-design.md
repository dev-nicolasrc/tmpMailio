# SEO Implementation Design — TmpMail
**Date:** 2026-03-25
**Spec source:** `docs/tmpmailio-seo-spec-v3.md`
**Current score:** 63/100 → **Target:** 80+/100
**Stack:** Next.js App Router · Cloudflare CDN · Tailwind CSS · next-intl · WebSocket

---

## Overview

This document describes the implementation plan for the SEO v3 spec for tmpmailio.com. Work is organized into 4 priority tiers matching the spec checklist. Each tier can be deployed independently. Cloudflare manual steps are called out explicitly within each tier.

**Model strategy:**
- Code changes → Claude Sonnet 4.6
- Editorial content generation (landing pages, About, homepage prose) → `claude-haiku-4-5-20251001` via parallel subagent

**Key exclusion:** Item 4.5 (SearchAction on WebSite schema) is excluded — the spec itself states it must only be added if a real search endpoint exists. No such functionality exists on the site.

---

## Tier 1 — Critical (deploy immediately)

### Cloudflare manual steps (before deploy)

**1. Enable HTML edge caching:**
- Cloudflare → Caching → Cache Rules → Create Rule
- Condition: `Hostname equals tmpmailio.com AND not starts with /api/`
- Action: Cache Level = Cache Everything
- Edge TTL: Override origin, 1 hour
- Browser TTL: Respect origin

**2. Allow AI crawlers (resolve robots.txt conflict):**
- Cloudflare → Security → Bots → AI Scrapers & Crawlers
- Disable blocking for: `GPTBot`, `ClaudeBot`, `Google-Extended`
- This stops Cloudflare from injecting `Disallow: /` for these bots before the site-operator rules

### Code changes

| File | Change |
|------|--------|
| `next.config.js` | Add `headers()`: `public, s-maxage=3600, stale-while-revalidate=86400` for `/:locale(en\|es)` and `/:locale/:slug`. Add permanent redirect `/` → `/en` (status 301) |
| `app/sitemap-index.xml/route.ts` | New file — return 404 to fix current 500 error on `/sitemap_index.xml` and `/sitemap-index.xml` |
| `app/robots.ts` | Add `Google-Extended: Allow /`. Add `Amazonbot`, `Bytespider`, `CCBot`: `Disallow: /` |
| `app/[locale]/layout.tsx` | Remove entire HowTo JSON-LD block (deprecated Sept 2023, zero SERP benefit) |
| `app/[locale]/contact/page.tsx` | Unique `generateMetadata`: title "Contact TmpMail — Support & Feedback" / "Contacto TmpMail — Soporte y Sugerencias"; unique description with 24–48h response time |
| `app/[locale]/privacy/page.tsx` | Unique `generateMetadata`: title and description highlighting GDPR + no data stored |

### Content (Haiku subagent)

Expand all 5 landing pages from ~220 words to 600-800 words of unique content per page. Content lives in `messages/en.json` and `messages/es.json` under the `useCases` namespace.

Structure per page:
- Intro paragraph (100-150 words, problem-specific)
- H2: How [use case] works — minimum 5 steps with contextual prose (150-200 words)
- H2: Why use a disposable email for [use case] — 3 H3 subsections with unique benefits
- H2: Real-world scenarios — 2-3 concrete examples with real service names (150 words)
- H2: FAQ — minimum 5 questions unique to this use case (not repeated from homepage)

Differentiation requirements per page:
- `/temporary-email-for-web-signups`: verification flows, SaaS retargeting via email
- `/avoid-email-spam`: spam list mechanics, opt-out, GDPR unsubscribe rights
- `/protect-email-privacy`: data brokers, email harvesting, pixel tracking, vs SimpleLogin
- `/temporary-email-social-media`: Twitter/X, Instagram, Discord multi-accounts, platform policies
- `/disposable-email-no-registration`: compare vs Mailinator (requires account), beta testing, voting systems

---

## Tier 2 — High (1-2 weeks)

### Cloudflare manual step

**www → apex redirect:**
- Cloudflare → Rules → Redirect Rules → Create Rule
- Name: `www to apex`
- Condition: `Hostname equals www.tmpmailio.com`
- Action: Static Redirect
- URL: `https://tmpmailio.com${http.request.uri}`
- Status: 301

### Code changes

| File | Change |
|------|--------|
| `lib/schema/webapp.ts` | New helper `buildWebAppSchema(locale)` — extract WebApplication schema from `page.tsx`, add `screenshot` (ImageObject pointing to OG image), `featureList` (locale-aware string), `datePublished: "2024-01-01"`, `dateModified: "2026-03-25"`, `browserRequirements` |
| `lib/schema/organization.ts` | New helper `buildOrganizationSchema(locale)` — extract from `layout.tsx`, add `description`, `foundingDate: "2024"`, `sameAs: [github_url, producthunt_url, twitter_url]`. URLs are `TODO` placeholders until external profiles confirmed |
| `app/[locale]/layout.tsx` | Replace inline schema objects with calls to new helpers. Add `<link rel="preconnect">` for `pagead2.googlesyndication.com` and `googleads.g.doubleclick.net`. Remove any self-preconnect to `tmpmailio.com` |
| `components/AdSense.tsx` | New `"use client"` component — loads AdSense script via `requestIdleCallback` (timeout 3000ms fallback). Replaces inline `<Script>` tag in layout |
| `app/globals.css` | Fix `heroFadeIn` / `.hero-h1`: remove `animation-delay`, change from `opacity: 0` start to `transform: translateY(8px)` only (Opcion B from spec). Add `prefers-reduced-motion: reduce` guard |
| `app/sitemap.ts` | Add `DATES` object with real per-page lastmod values. Static pages get their actual last-edit dates; landing pages get `2026-03-19` |
| `middleware.ts` | CSP enforced mode — **prerequisite: review `/api/csp-report` violations log first**. Replace `content-security-policy-report-only` with `content-security-policy`. Add nonce to inline scripts |

### Content (Haiku subagent)

Rewrite About page (EN + ES) with:
- Legal/organizational identity statement (operator name, country)
- Origin story: why TmpMail was built, what personal problem it solved
- Technical decisions section: Redis (why not PostgreSQL), Mail.tm (why chosen)
- Comparison table vs Guerrilla Mail, 10 Minute Mail, Mailinator
- GDPR data controller statement
- Visible contact email with response time

---

## Tier 3 — Medium (next month)

### Code changes

| File | Change |
|------|--------|
| `lib/schema/breadcrumb.ts` | New helper `buildBreadcrumbSchema(locale, pageName, pageSlug)` — returns 2-item BreadcrumbList |
| `app/[locale]/privacy/page.tsx`, `terms`, `about`, `contact` | Add BreadcrumbList JSON-LD using helper |
| `app/[locale]/page.tsx` | Remove single-item BreadcrumbList (no rich result benefit) |
| `app/[locale]/about/page.tsx` | Title: "About TmpMail — Privacy-First Disposable Email Service" (EN) / "Sobre TmpMail — Servicio de Email Temporal con Privacidad" (ES) |
| `app/[locale]/contact/page.tsx` | Title: "Contact TmpMail — Get Support in 24–48 Hours" (EN). Add visible `<a href="mailto:contacto@tmpmailio.com">` in page body |
| `app/[locale]/privacy/page.tsx` | Title: "Privacy Policy — TmpMail \| No Data Stored, GDPR Compliant" |
| `app/[locale]/terms/page.tsx` | Title with keywords, not generic |
| `app/[locale]/[slug]/page.tsx` | Add H3 subheadings inside each H2 section that exceeds 100 words |
| `components/Mailbox/MailboxWidget.tsx` | Measure hydrated widget height in DevTools; align skeleton `h-[Xpx]` to match exactly |
| Header nav components | `LocaleSwitcher` and `ThemeToggle`: add `min-h-[48px] min-w-[48px]` to meet Google's 48dp tap target requirement |
| FAQ + button components | Replace `text-xs` with `text-sm` on answer text and secondary button labels |
| `public/manifest.en.json` + `public/manifest.es.json` | Two localized manifests. EN: `start_url: "/en"`, `lang: "en"`. ES: `start_url: "/es"`, `lang: "es"` |
| `app/[locale]/layout.tsx` | Serve localized manifest: `<link rel="manifest" href={"/manifest." + locale + ".json"}>` |

### Content (Haiku subagent)

Expand homepage prose sections in `messages/en.json` and `messages/es.json`:
- New section "Who Uses Temporary Email" (~80 words): developers, journalists, privacy users, one-time registrations
- New section "TmpMail vs Other Disposable Email Services" (~100 words): vs Guerrilla Mail, Mailinator, SimpleLogin — concrete differentiators (Redis in-memory, no account, no CAPTCHA)

Target: homepage visible word count 369 → 550+

---

## Tier 4 — Backlog

### Code changes

| File | Change |
|------|--------|
| `app/[locale]/[slug]/page.tsx` `generateMetadata` | Unique `keywords` array per landing page slug |
| `app/layout.tsx` | Add skip-to-content link as first element of `<body>`. Add `id="main-content"` to `<main>` |
| `app/[locale]/layout.tsx` | Add `twitter:site` with real @handle once account exists |
| `app/[locale]/layout.tsx` | Trim homepage meta description from 154 → ≤150 chars |
| `lib/schema/organization.ts` | Add `foundingDate: "2024"` (may already be in Tier 2 helper) |
| `package.json` + `next.config.js` | Add `@next/bundle-analyzer`, run audit on 52.5KB vendor chunk |

### External manual actions

- Publish TmpMail on ProductHunt
- Create Twitter/X account `@tmpmailio`
- Create listing on AlternativeTo
- Once done: add all URLs to `sameAs` array in `lib/schema/organization.ts`

---

## Files touched summary

```
next.config.js
middleware.ts
app/robots.ts
app/sitemap.ts
app/sitemap-index.xml/route.ts          ← new
app/layout.tsx
app/[locale]/layout.tsx
app/[locale]/page.tsx
app/[locale]/about/page.tsx
app/[locale]/contact/page.tsx
app/[locale]/privacy/page.tsx
app/[locale]/terms/page.tsx
app/[locale]/[slug]/page.tsx
app/globals.css
lib/schema/webapp.ts                     ← new
lib/schema/organization.ts              ← new
lib/schema/breadcrumb.ts                ← new
components/AdSense.tsx                  ← new
components/ui/LocaleSwitcher.tsx
components/ui/ThemeToggle.tsx
public/manifest.en.json                 ← new
public/manifest.es.json                 ← new
messages/en.json
messages/es.json
```

---

## Verification commands

```bash
# After Tier 1 deploy — cache headers
for i in 1 2 3; do curl -sI https://tmpmailio.com/en | grep cf-cache-status; done
# Expected: MISS, HIT, HIT

# Root redirect is 301
curl -sI https://tmpmailio.com/ | grep -E "HTTP|location"

# sitemap_index returns 404 not 500
curl -sI https://tmpmailio.com/sitemap_index.xml | grep HTTP

# No HowTo schema in HTML
curl -s https://tmpmailio.com/en | python3 -c "
import sys,json,re; html=sys.stdin.read()
schemas=re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>',html,re.DOTALL)
types=[json.loads(s).get('@type') for s in schemas]
print('HowTo present' if 'HowTo' in types else 'OK: No HowTo')
"
```

---

## Success metrics

| Category | Current | Target |
|----------|---------|--------|
| Technical SEO | 71 | 88 |
| Content Quality | 61 | 75 |
| On-Page SEO | 55 | 74 |
| Schema | 65 | 82 |
| Performance | 55 | 80 |
| AI Search Readiness | 45 | 70 |
| **Health Score** | **63** | **~80** |
