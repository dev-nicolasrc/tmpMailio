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

**Key exclusions (with justification):**
- **Item 4.5 (SearchAction):** Spec itself states it must only be added if a real search endpoint exists. No such functionality exists on the site. Excluded.
- **`@next/bundle-analyzer` install (Tier 4):** Already installed and configured in `next.config.js` (lines 2–4, controlled via `ANALYZE=true` env var). Tier 4 action is to run the audit, not install.

---

## Tier 1 — Critical (deploy immediately)

### Pre-deploy: Cloudflare manual steps

**Step 1 — Enable HTML edge caching:**
- Cloudflare dashboard → Caching → Cache Rules → Create Rule
- Condition: `Hostname equals tmpmailio.com AND URI Path does not start with /api/`
- Action: Cache Level = Cache Everything
- Edge TTL: Override origin TTL → 1 hour
- Browser TTL: Respect origin
> This ensures Cloudflare caches the HTML shell even if origin sends conservative headers.

**Step 2 — Allow AI crawlers (resolve robots.txt conflict):**
- Cloudflare dashboard → Security → Bots → AI Scrapers & Crawlers
- Individually disable blocking for: `GPTBot`, `ClaudeBot`, `Google-Extended`
- This stops Cloudflare from injecting its own `Disallow: /` rules before the Next.js robots handler, which was causing the conflict described in spec section 3.1.

### Code changes

| File | Change |
|------|--------|
| `next.config.js` | Change `/:locale(es\|en)` header from `no-store` to `public, s-maxage=3600, stale-while-revalidate=86400`. The `/:locale/:path+` rule already has correct caching headers — no change needed there. |
| `middleware.ts` | Change root redirect from 302 to 301: `NextResponse.redirect(..., 302)` → `NextResponse.redirect(..., 301)`. **Note:** This removes the Accept-Language re-detection on every visit to `/`. Users who previously relied on language auto-detection will now be cached to `/en`. They can switch via the locale switcher. Hreflang tags handle the multi-language signal for Googlebot — the 301 is needed to consolidate PageRank. |
| `app/sitemap-index.xml/route.ts` | New file — return 404. Fixes current 500 on `/sitemap-index.xml`. |
| `app/sitemap_index.xml/route.ts` | New file — return 404. Fixes current 500 on `/sitemap_index.xml` (underscore variant). Both paths need handlers. |
| `app/robots.ts` | Add `{ userAgent: "Google-Extended", allow: "/" }`. Add `{ userAgent: "Amazonbot", disallow: "/" }`, `{ userAgent: "Bytespider", disallow: "/" }`, `{ userAgent: "CCBot", disallow: "/" }`. |
| `app/[locale]/layout.tsx` | **Remove HowTo JSON-LD block** (lines 150–167). Also remove the `howToSteps` variable and the `getTranslations("seoContent")` fetch that feeds it (lines 90–92) — dead code after removal. **Note:** Source spec (section 4.1) incorrectly states this block is in `page.tsx`; it is actually in `layout.tsx`. |
| `app/[locale]/contact/page.tsx` | Update `generateMetadata`: title → "Contact TmpMail — Get Support in 24–48 Hours" (EN) / "Contacto TmpMail — Soporte en 24–48 Horas" (ES); unique description mentioning response time. |
| `app/[locale]/privacy/page.tsx` | Update `generateMetadata`: title → "Privacy Policy — TmpMail \| No Data Stored, GDPR Compliant" (EN) / "Política de Privacidad — TmpMail \| RGPD, Sin Datos Almacenados" (ES); unique description. |

**Verify SSR does not include per-user data (prerequisite for caching):**
Before enabling Cloudflare edge caching, confirm the HTML shell served by `app/[locale]/page.tsx` contains no per-user email address in the SSR output. The inbox widget should render as a static skeleton (`animate-pulse`) during SSR — email address is generated client-side via WebSocket. Check: `curl -s https://tmpmailio.com/en | grep -i "@tmpmailio"` — should return nothing.

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
- `/disposable-email-no-registration`: compare vs Mailinator (requires account for persistence), beta testing, voting systems

---

## Tier 2 — High (1-2 weeks)

### Cloudflare manual step

**www → apex redirect:**
- Cloudflare dashboard → Rules → Redirect Rules → Create Rule
- Name: `www to apex`
- Condition: `Hostname equals www.tmpmailio.com`
- Action type: **Dynamic Redirect** (not Static — Static does not support expression variables)
- Redirect URL expression: `concat("https://tmpmailio.com", http.request.uri)`
- Status code: 301

### Pre-code prerequisite — CSP violation review

Before implementing 7.1, check the CSP violation log:
- Access `/api/csp-report` endpoint or wherever reports are stored
- Identify all legitimate sources currently blocked (AdSense domains, WebSocket to `api.tmpmailio.com`, any inline scripts from Next.js hydration)
- Resolve each violation before switching from `report-only` to enforced
- Minimum observation period: 48h of production traffic in report-only mode

### Code changes

| File | Change |
|------|--------|
| `lib/schema/webapp.ts` | **New file** — extract WebApplication schema from `app/[locale]/page.tsx` into `buildWebAppSchema(locale)`. Add: `screenshot` (ImageObject pointing to OG image URL), `featureList` (locale-specific string of 8 features), `datePublished: "2024-01-01"`, `dateModified: "2026-03-25"`, `browserRequirements`. |
| `lib/schema/organization.ts` | **New file** — extract Organization schema from `app/[locale]/layout.tsx` into `buildOrganizationSchema(locale)`. Add: `description`, `foundingDate: "2024"`, `sameAs: [github_url, producthunt_url, twitter_url]`. The GitHub URL is known; ProductHunt and Twitter are `TODO` placeholders to be filled before deploy. |
| `app/[locale]/page.tsx` | Replace inline WebApplication JSON-LD with `buildWebAppSchema(locale)`. |
| `app/[locale]/layout.tsx` | Replace inline Organization JSON-LD with `buildOrganizationSchema(locale)`. Add `<link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous">` and `<link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous">` to `<head>`. Remove any self-preconnect to `tmpmailio.com` if present. |
| `components/AdSense.tsx` | **New file** — `"use client"` component that loads AdSense via `requestIdleCallback` (3000ms timeout fallback). **Note:** `layout.tsx` currently uses Next.js `<Script strategy="afterInteractive">`, which fires after hydration. `requestIdleCallback` fires during browser idle time — a meaningful further delay that reduces INP impact. Replace the existing `<Script>` tag with this component. |
| Ad slot containers | For each `<ins className="adsbygoogle">` container, add `style={{ minHeight: "90px" }}` (leaderboard) or `style={{ minHeight: "250px", minWidth: "300px" }}` (medium rectangle). This prevents CLS from dynamic ad injection. |
| `app/globals.css` | Fix `.hero-h1` / `heroFadeIn`: change start keyframe from `opacity: 0` to `opacity: 0.8` (or switch to transform-only animation). Remove `animation-delay`. Add `@media (prefers-reduced-motion: reduce) { .hero-h1 { animation: none; } }`. |
| `app/sitemap.ts` | Add `DATES` object with real per-page lastmod values. Static pages (privacy, terms, contact, about) get their actual last-edit dates; landing pages get `2026-03-19`; home gets `2026-03-19`. Never use `new Date()` — generates a new date on each build regardless of content change. |
| `middleware.ts` | After CSP violation review is complete: change `content-security-policy-report-only` header to `content-security-policy`. Add nonce generation and pass via `x-nonce` header to inline scripts. |
| `app/[locale]/layout.tsx` (FAQ quality) | Review each FAQ answer in `messages/en.json` and `messages/es.json` under `faq` namespace. Each answer must contain specific verifiable facts: exact durations, limits, policy details. Generic answers ("It lasts a short time") must be replaced with factual ones ("Your address lasts 10 minutes; each email received adds 5 minutes"). |

### Content (Haiku subagent)

Rewrite About page content keys in `messages/en.json` and `messages/es.json`:
- Legal/organizational identity statement (operator name, country, GDPR data controller)
- Origin story: why TmpMail was built, what personal problem it solved, when it launched
- Technical decisions: Redis (why not PostgreSQL — in-memory ephemeral), Mail.tm (why chosen as infrastructure)
- Comparison table vs Guerrilla Mail, 10 Minute Mail, Mailinator (concrete differentiators)
- Privacy commitments section with GDPR statement
- Visible contact email with 24–48h response time

---

## Tier 3 — Medium (next month)

### Code changes

| File | Change |
|------|--------|
| `lib/schema/breadcrumb.ts` | **New file** — `buildBreadcrumbSchema(locale, pageName, pageSlug)` returning a 2-item BreadcrumbList. |
| `app/[locale]/privacy/page.tsx`, `terms`, `about`, `contact` | Add BreadcrumbList JSON-LD using `buildBreadcrumbSchema` helper. |
| `app/[locale]/page.tsx` | Remove the existing single-item BreadcrumbList JSON-LD block — a 1-element breadcrumb is inert for rich results and adds HTML noise. |
| `app/[locale]/about/page.tsx` | Title: "About TmpMail — Privacy-First Disposable Email Service" (EN, 55 chars) / "Sobre TmpMail — Servicio de Email Temporal con Privacidad" (ES). |
| `app/[locale]/contact/page.tsx` | Add visible `<a href="mailto:contacto@tmpmailio.com">contacto@tmpmailio.com</a>` in page body (in addition to the form). |
| `app/[locale]/terms/page.tsx` | Update title to include keywords: "Terms of Service — TmpMail Disposable Email" (EN). |
| `app/[locale]/[slug]/page.tsx` | Add H3 subheadings inside each H2 section that exceeds 100 words. Every `<h2>` in the How-to, Why, and FAQ sections should have at least 2 `<h3>` children. |
| `components/Mailbox/MailboxWidget.tsx` | Measure hydrated widget height in DevTools. If hydrated height ≠ skeleton height (`h-[60px]`), update skeleton class to match. |
| Header nav (LocaleSwitcher + ThemeToggle) | Add `min-h-[48px] min-w-[48px]` to both components to meet Google's 48dp minimum tap target. |
| FAQ + button text | Change `text-xs` → `text-sm` on FAQ answer text and secondary button labels. Keep `text-xs` only on purely decorative elements (step numbers, separators). |
| `public/manifest.en.json` | **New file** — `{ "start_url": "/en", "lang": "en", ... }` |
| `public/manifest.es.json` | **New file** — `{ "start_url": "/es", "lang": "es", ... }` |
| `app/[locale]/layout.tsx` | Change `<link rel="manifest">` to point to localized manifest: `href={"/manifest." + locale + ".json"}`. Remove `public/manifest.json` generic file. |

### Content (Haiku subagent)

Add two new sections to homepage content in `messages/en.json` and `messages/es.json`:
- **"Who Uses Temporary Email"** (~80 words): developers testing signup flows, journalists, privacy-conscious users, one-time service registrations
- **"TmpMail vs Other Disposable Email Services"** (~100 words): concrete differentiators vs Guerrilla Mail, Mailinator, SimpleLogin — Redis in-memory storage, no account needed, no CAPTCHA, no alias traceability

Target: homepage visible word count 369 → 550+ words.

---

## Tier 4 — Backlog

### Code changes

| File | Change |
|------|--------|
| `app/[locale]/[slug]/page.tsx` → `generateMetadata` | Add unique `keywords` array per landing page slug (see spec section 5.3 for per-page keyword lists). |
| `app/layout.tsx` | Add skip-to-content `<a>` as first element of `<body>` with `sr-only focus:not-sr-only` classes. Add `id="main-content"` to `<main>`. |
| `app/[locale]/layout.tsx` | Add `twitter:site` with real @handle once Twitter account is created. |
| `app/[locale]/layout.tsx` | Trim homepage meta description from 154 chars to ≤150 chars. |
| `lib/schema/organization.ts` | Verify `foundingDate: "2024"` is included (likely added in Tier 2 — skip if already done). |
| `next.config.js` | Run bundle analyzer: `ANALYZE=true npm run build`. Audit the 52.5KB vendor chunk. The analyzer is already configured — no installation needed. |

### External manual actions (not code)

- Publish TmpMail on ProductHunt
- Create Twitter/X account `@tmpmailio`
- Create listing on AlternativeTo
- Once done: update `sameAs` array in `lib/schema/organization.ts` with all real URLs

---

## Files touched summary

```
apps/frontend/next.config.js
apps/frontend/middleware.ts
apps/frontend/app/robots.ts
apps/frontend/app/sitemap.ts
apps/frontend/app/layout.tsx
apps/frontend/app/sitemap-index.xml/route.ts          ← new
apps/frontend/app/sitemap_index.xml/route.ts           ← new
apps/frontend/app/[locale]/layout.tsx
apps/frontend/app/[locale]/page.tsx
apps/frontend/app/[locale]/about/page.tsx
apps/frontend/app/[locale]/contact/page.tsx
apps/frontend/app/[locale]/privacy/page.tsx
apps/frontend/app/[locale]/terms/page.tsx
apps/frontend/app/[locale]/[slug]/page.tsx
apps/frontend/app/globals.css
apps/frontend/lib/schema/webapp.ts                     ← new
apps/frontend/lib/schema/organization.ts              ← new
apps/frontend/lib/schema/breadcrumb.ts                ← new
apps/frontend/components/AdSense.tsx                  ← new
apps/frontend/components/ui/LocaleSwitcher.tsx
apps/frontend/components/ui/ThemeToggle.tsx
apps/frontend/public/manifest.en.json                 ← new
apps/frontend/public/manifest.es.json                 ← new
apps/frontend/messages/en.json
apps/frontend/messages/es.json
```

---

## Verification commands

```bash
# After Tier 1 deploy — confirm edge caching is active
for i in 1 2 3; do curl -sI https://tmpmailio.com/en | grep cf-cache-status; done
# Expected: MISS → HIT → HIT

# Root redirect is 301
curl -sI https://tmpmailio.com/ | grep -E "^HTTP|^location"
# Expected: HTTP/2 301 + location: https://tmpmailio.com/en

# sitemap_index variants return 404 not 500
curl -sI https://tmpmailio.com/sitemap_index.xml | grep HTTP
curl -sI https://tmpmailio.com/sitemap-index.xml | grep HTTP
# Expected: HTTP/2 404

# No HowTo schema in HTML
curl -s https://tmpmailio.com/en | python3 -c "
import sys, json, re
html = sys.stdin.read()
schemas = re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.DOTALL)
types = [json.loads(s).get('@type') for s in schemas]
print('ERROR: HowTo present' if 'HowTo' in types else 'OK: No HowTo')
"

# SSR contains no user email address (prerequisite for caching)
curl -s https://tmpmailio.com/en | grep -i "@tmpmailio"
# Expected: no output
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
