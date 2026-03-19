# Design Spec: LATAM Use-Case Landing Pages

**Date:** 2026-03-19
**Status:** Approved
**Context:** LATAM positioning guide from session report 2026-03-18

---

## Overview

Create 5 bilingual use-case landing pages (5 ES + 5 EN = 10 URLs total) for long-tail keyword targeting in LATAM markets. Each page targets a specific use case, embeds the live mailbox widget, and is pre-rendered as static HTML at build time.

---

## Goals

- Capture long-tail keywords with lower competition than generic terms (e.g. "correo temporal para registros web" vs "correo temporal")
- ~600 indexable words per page
- Zero friction: mailbox widget embedded directly so users can start immediately without navigating to homepage
- Proper hreflang ES↔EN on all pages
- Consistent visual language with the existing site

---

## URLs

| ES slug | EN slug |
|---------|---------|
| `/es/correo-temporal-para-registros-web` | `/en/temporary-email-for-web-signups` |
| `/es/email-desechable-sin-registro` | `/en/disposable-email-no-registration` |
| `/es/proteger-privacidad-email` | `/en/protect-email-privacy` |
| `/es/correo-temporal-redes-sociales` | `/en/temporary-email-social-media` |
| `/es/evitar-spam-correo-personal` | `/en/avoid-email-spam` |

---

## Architecture

### Routing

**File:** `app/[locale]/[slug]/page.tsx`

Dynamic route that coexists with `about/`, `privacy/`, `terms/`, `contact/` — Next.js App Router gives precedence to named directories over dynamic segments.

`generateStaticParams` returns exactly 10 `{ locale, slug }` combinations derived from `SLUG_PAIRS`. Any slug not in the whitelist returns `notFound()`.

### Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `lib/use-cases.ts` | **Create** | Slug pairs, types, lookup helpers |
| `components/Mailbox/MailboxWidget.tsx` | **Create** | Extracted mailbox UI from `page.tsx` |
| `app/[locale]/[slug]/page.tsx` | **Create** | Use-case page template |
| `app/[locale]/page.tsx` | **Modify** | Import `MailboxWidget` instead of inline widget |
| `messages/es.json` | **Modify** | Add `useCases` key with content for all 5 ES pages |
| `messages/en.json` | **Modify** | Add `useCases` key with content for all 5 EN pages |

---

## `lib/use-cases.ts`

```ts
export const SLUG_PAIRS = [
  { es: "correo-temporal-para-registros-web",  en: "temporary-email-for-web-signups" },
  { es: "email-desechable-sin-registro",        en: "disposable-email-no-registration" },
  { es: "proteger-privacidad-email",            en: "protect-email-privacy" },
  { es: "correo-temporal-redes-sociales",       en: "temporary-email-social-media" },
  { es: "evitar-spam-correo-personal",          en: "avoid-email-spam" },
] as const

// All valid slugs regardless of locale
export const ALL_SLUGS = SLUG_PAIRS.flatMap(p => [p.es, p.en])

// Given a slug and its locale, return the alternate locale's slug
export function getAlternateSlug(slug: string, locale: "es" | "en"): string | null {
  const pair = SLUG_PAIRS.find(p => p[locale] === slug)
  if (!pair) return null
  return locale === "es" ? pair.en : pair.es
}

// Given a slug, return its locale ("es" | "en" | null)
export function getSlugLocale(slug: string): "es" | "en" | null {
  for (const pair of SLUG_PAIRS) {
    if (pair.es === slug) return "es"
    if (pair.en === slug) return "en"
  }
  return null
}
```

---

## `MailboxWidget` Component

Extracted from `app/[locale]/page.tsx`. Contains all mailbox UI state and logic:

- `useMailbox()` hook
- `useSocket()` hook
- `useClipboard()` hook
- `useTypewriter()` for the address animation
- `isMobile` state for responsive layout
- `showDomainPicker` state + `DomainDropdown`
- Address box with typewriter + blinking cursor
- Action buttons: copy, new mailbox, QR, delete
- `ExpirationTimer` with `onExpired` auto-renewal + toast
- Loading skeleton (matches current `h-[60px]` height for CLS)
- `QRModal`
- `Toast`

**Props:** none — fully self-contained, uses global Zustand store.

`app/[locale]/page.tsx` replaces its inline widget block with `<MailboxWidget />`.

---

## Use-Case Page Template

**File:** `app/[locale]/[slug]/page.tsx`

```
Server component (async)
├── generateStaticParams → 10 { locale, slug } combinations
├── generateMetadata → title, description, canonical, hreflang, openGraph, BreadcrumbList JSON-LD
└── UseCasePage
    ├── <header> — nav: logo + LocaleSwitcher + ThemeToggle
    ├── <main>
    │   ├── <section> hero: // label, <h1>, <p intro>
    │   ├── <section> widget: <MailboxWidget /> (client component)
    │   ├── <section> how-to: <h2>, <ol> steps
    │   ├── <section> why: <h2>, <ul> whyItems (✓ prefix)
    │   └── <section> faq: <details>/<summary> items
    └── <Footer />
```

---

## Content Schema (`messages/*.json`)

New top-level key `useCases`. Each slug is a key within it:

```json
"useCases": {
  "<slug>": {
    "title": "Page H1 — keyword principal (max 60 chars)",
    "description": "Meta description with keyword (max 155 chars)",
    "intro": "Opening paragraph ~100 words",
    "howTitle": "Section heading for how-to",
    "steps": ["Step 1 text", "Step 2 text", "Step 3 text"],
    "whyTitle": "Section heading for why TmpMail",
    "whyItems": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
    "faq": [
      { "q": "Question text", "a": "Answer text ~40 words" },
      { "q": "Question text", "a": "Answer text ~40 words" }
    ]
  }
}
```

All 5 ES slugs go in `messages/es.json`, all 5 EN slugs go in `messages/en.json`.

---

## SEO: `generateMetadata`

```ts
{
  title: t("title"),           // from useCases.<slug>.title
  description: t("description"),
  alternates: {
    canonical: `https://tmpmailio.com/${locale}/${slug}`,
    languages: {
      es: `https://tmpmailio.com/es/${esPair}`,
      en: `https://tmpmailio.com/en/${enPair}`,
      "x-default": `https://tmpmailio.com/en/${enPair}`,
    },
  },
  openGraph: {
    title: t("title"),
    description: t("description"),
    url: `https://tmpmailio.com/${locale}/${slug}`,
    siteName: "TmpMail",
    type: "website",
    locale: locale === "es" ? "es_ES" : "en_US",
    alternateLocale: locale === "es" ? "en_US" : "es_ES",
  },
}
```

**BreadcrumbList JSON-LD** (inline `<script>` in page body):
```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "TmpMail", "item": "https://tmpmailio.com/{locale}" },
    { "@type": "ListItem", "position": 2, "name": "{title}", "item": "https://tmpmailio.com/{locale}/{slug}" }
  ]
}
```

---

## Page Visual Structure

Each page reuses existing CSS variables and component patterns:

```
┌─ header ──────────────────────────────────────┐
│  TMPMAIL v2          [ES/EN]  [DARK/LIGHT]    │
└───────────────────────────────────────────────┘

┌─ hero (grid-bg, border-bottom) ───────────────┐
│  // label mono                                │
│  H1 — keyword principal                       │
│  p — intro ~100 palabras                      │
└───────────────────────────────────────────────┘

┌─ widget section ──────────────────────────────┐
│  <MailboxWidget />                            │
└───────────────────────────────────────────────┘

┌─ how-to section ──────────────────────────────┐
│  H2 — howTitle                                │
│  01. step one                                 │
│  02. step two                                 │
│  03. step three                               │
└───────────────────────────────────────────────┘

┌─ why section ─────────────────────────────────┐
│  H2 — whyTitle                                │
│  ✓ benefit one                                │
│  ✓ benefit two                                │
└───────────────────────────────────────────────┘

┌─ faq section ─────────────────────────────────┐
│  <details><summary> Q1 </summary> A1 </details>│
│  <details><summary> Q2 </summary> A2 </details>│
└───────────────────────────────────────────────┘

┌─ footer ──────────────────────────────────────┘
```

---

## Error Handling

- Unknown slug (not in `SLUG_PAIRS`) → `notFound()` → existing `not-found.tsx`
- Locale mismatch (ES slug with EN locale, e.g. `/en/correo-temporal-para-registros-web`) → `notFound()`. Each slug is locale-specific; `getSlugLocale(slug)` is checked against `params.locale`.

---

## Testing Checklist

- [ ] All 10 URLs return 200 in `next build` output (marked as `●` SSG)
- [ ] `/es/correo-temporal-desconocido` returns 404
- [ ] `/en/correo-temporal-para-registros-web` returns 404 (ES slug on EN locale)
- [ ] hreflang ES↔EN correct on each page (validate in browser source)
- [ ] `MailboxWidget` functions identically on use-case pages and homepage
- [ ] Mobile layout — widget + sections stack correctly
- [ ] Word count per page ≥ 500 (title + intro + steps + why + faq)
