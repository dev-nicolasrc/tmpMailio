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

`generateStaticParams` returns exactly 10 `{ locale, slug }` combinations derived from `SLUG_PAIRS`.

**`export const dynamicParams = false`** must be set so that any slug not in `generateStaticParams` is automatically returned as 404 by the framework, without reaching the page component.

The page component also includes a runtime guard for defense-in-depth:

```ts
const slugLocale = getSlugLocale(slug)
if (!slugLocale || slugLocale !== locale) notFound()
```

This handles the locale-mismatch case (e.g. `/en/correo-temporal-para-registros-web`): `getSlugLocale` returns `"es"` ≠ `"en"` → `notFound()`. Invalid locales (e.g. `/fr/`) are already caught by the `[locale]/layout.tsx` which calls `notFound()` when `!locales.includes(locale)`, so they never reach the page component.

### Files Created / Modified

| File | Action | Purpose |
|------|--------|---------|
| `lib/use-cases.ts` | **Create** | Slug pairs, types, lookup helpers |
| `components/Mailbox/MailboxWidget.tsx` | **Create** | Extracted mailbox widget from `page.tsx`, must have `"use client"` at top |
| `app/[locale]/[slug]/page.tsx` | **Create** | Use-case page (server component) |
| `app/[locale]/page.tsx` | **Modify** | Replace inline widget block with `<MailboxWidget />` |
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

// Given a slug and its locale, return the alternate locale's slug
export function getAlternateSlug(slug: string, locale: "es" | "en"): string | null {
  const pair = SLUG_PAIRS.find(p => p[locale] === slug)
  if (!pair) return null
  return locale === "es" ? pair.en : pair.es
}

// Given a slug, return its locale ("es" | "en") or null if not found
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

**File:** `components/Mailbox/MailboxWidget.tsx`

Must begin with `"use client"` — it uses hooks (`useState`, `useEffect`, `useRef`) and browser APIs. All hooks it imports (`useMailbox`, `useSocket`, `useClipboard`) are client-only and safe.

**Extracted from `app/[locale]/page.tsx`** — only the mailbox hero widget block, not the page's other sections. Specifically moves:

- `useMailbox()`, `useSocket()`, `useClipboard()` calls
- `useTypewriter()` helper function
- `isMobile` state + resize listener
- `showDomainPicker` state + `DomainDropdown`
- Address box with typewriter + blinking cursor
- Action buttons: copy, new mailbox, QR, delete
- `ExpirationTimer` with `onExpired` auto-renewal + `showToast`
- Loading skeleton (`h-[60px]` for CLS consistency)
- `QRModal`
- `Toast`

**What stays in `app/[locale]/page.tsx`** (not moved): the page layout shell, header, `InboxPanel`, `EmailViewer`, SEO content sections, `FAQAccordion`, `Footer`, and the JSON-LD `<script>` tags. The homepage simply replaces its inline widget block with `<MailboxWidget />`.

**`app/[locale]/page.tsx` remains a `"use client"` component** after extraction. It uses `useTranslations`, `useLocale`, and other client hooks — it is not and will not become a server component. Only the use-case page (`[slug]/page.tsx`) is a server component.

**Props:** none — fully self-contained via global Zustand store.

---

## Use-Case Page Template

**File:** `app/[locale]/[slug]/page.tsx` — async server component.

### next-intl namespace pattern

Translations use `getTranslations({ locale, namespace: "useCases" })`. Message keys are accessed as `t(`${slug}.title`)` (e.g. `t("correo-temporal-para-registros-web.title")`). The namespace is always `"useCases"` (no hyphens) — hyphens only appear in the sub-key names, which is valid next-intl behavior.

### `generateMetadata`

Calls `setRequestLocale(locale)` first (required by next-intl for static rendering). Returns empty metadata `{}` for invalid slugs — `notFound()` cannot be called from `generateMetadata`; the page component handles the 404. This means 404 pages may briefly inherit the layout's metadata, which is acceptable.

```ts
export async function generateMetadata({ params: { locale, slug } }: Props): Promise<Metadata> {
  setRequestLocale(locale)
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"
  const slugLocale = getSlugLocale(slug)
  if (!slugLocale || slugLocale !== locale) return {}

  const t = await getTranslations({ locale, namespace: "useCases" })
  const altSlug = getAlternateSlug(slug, locale as "es" | "en")!
  const altLocale = locale === "es" ? "en" : "es"

  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.description`),
    alternates: {
      canonical: `${canonical}/${locale}/${slug}`,
      languages: {
        es: `${canonical}/es/${locale === "es" ? slug : altSlug}`,
        en: `${canonical}/en/${locale === "en" ? slug : altSlug}`,
        "x-default": `${canonical}/en/${locale === "en" ? slug : altSlug}`,
      },
    },
    openGraph: {
      title: t(`${slug}.title`),
      description: t(`${slug}.description`),
      url: `${canonical}/${locale}/${slug}`,
      siteName: "TmpMail",
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      alternateLocale: locale === "es" ? "en_US" : "es_ES",
      images: [{ url: `${canonical}/${locale}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t(`${slug}.title`),
      description: t(`${slug}.description`),
      images: [`${canonical}/${locale}/opengraph-image`],
    },
  }
}
```

### `generateStaticParams`

```ts
export const dynamicParams = false  // unknown slugs → 404 at framework level

export function generateStaticParams() {
  return SLUG_PAIRS.flatMap(pair => [
    { locale: "es", slug: pair.es },
    { locale: "en", slug: pair.en },
  ])
}
```

### Page Component

```ts
export default async function UseCasePage({ params: { locale, slug } }: Props) {
  setRequestLocale(locale)

  const slugLocale = getSlugLocale(slug)
  if (!slugLocale || slugLocale !== locale) notFound()

  const t = await getTranslations({ locale, namespace: "useCases" })
  const altSlug = getAlternateSlug(slug, locale as "es" | "en")!
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"

  return (
    <div>
      {/* BreadcrumbList JSON-LD */}
      {/* Header with LocaleSwitcher pointing to alternate slug */}
      {/* Hero: H1 + intro */}
      {/* MailboxWidget */}
      {/* How-to: h2 + ordered steps */}
      {/* Why TmpMail: h2 + checkmark list */}
      {/* FAQ: details/summary pairs */}
      {/* Footer */}
    </div>
  )
}
```

### LocaleSwitcher — alternate slug handling

The existing `LocaleSwitcher` uses `usePathname()` and replaces the locale prefix, which would produce an invalid URL (e.g. `/en/correo-temporal-para-registros-web` → 404). The use-case page must **not** use the shared `LocaleSwitcher` for this nav item.

Instead, the use-case page header builds the locale switch link directly using `altSlug` from `getAlternateSlug`. A simple inline `<Link href={`/${altLocale}/${altSlug}`}>` replaces the `LocaleSwitcher` in the use-case page header.

---

## Content Schema (`messages/*.json`)

New top-level key `useCases`. Each slug is a nested key (hyphens are valid JSON keys):

```json
"useCases": {
  "correo-temporal-para-registros-web": {
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
  },
  "email-desechable-sin-registro": { ... },
  "proteger-privacidad-email": { ... },
  "correo-temporal-redes-sociales": { ... },
  "evitar-spam-correo-personal": { ... }
}
```

`messages/es.json` contains all 5 ES slugs. `messages/en.json` contains all 5 EN slugs.

Accessed via `getTranslations({ locale, namespace: "useCases" })` then `t(`${slug}.title`)`, `t.raw(`${slug}.steps`)`, etc.

---

## BreadcrumbList JSON-LD

Inline `<script type="application/ld+json">` in the page body. Uses env var for domain:

```ts
JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "TmpMail", item: `${canonical}/${locale}` },
    { "@type": "ListItem", position: 2, name: t(`${slug}.title`), item: `${canonical}/${locale}/${slug}` },
  ],
})
```

---

## Page Visual Structure

```
┌─ header ──────────────────────────────────────┐
│  TMPMAIL v2     [EN/ES direct link]  [DARK]   │
│                 ↑ inline Link to altSlug       │
└───────────────────────────────────────────────┘

┌─ hero (grid-bg, border-bottom) ───────────────┐
│  // label mono                                │
│  H1 — t(`${slug}.title`)                     │
│  p — t(`${slug}.intro`) ~100 palabras         │
└───────────────────────────────────────────────┘

┌─ widget section ──────────────────────────────┐
│  <MailboxWidget />                            │
└───────────────────────────────────────────────┘

┌─ how-to section ──────────────────────────────┐
│  H2 — t(`${slug}.howTitle`)                  │
│  01. step one                                 │
│  02. step two                                 │
│  03. step three                               │
└───────────────────────────────────────────────┘

┌─ why section ─────────────────────────────────┐
│  H2 — t(`${slug}.whyTitle`)                  │
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

## Cache-Control Consideration

`next.config.js` applies `Cache-Control: no-store, no-cache, must-revalidate` to all non-asset routes, including the use-case pages. This means Cloudflare and browsers will not cache the static HTML for these pages — every request hits the Next.js server.

The pages are still **built** as static HTML (`○` in build output) and served from the pre-rendered file on each request, so TTFB from Next.js is fast. The mailbox widget is entirely client-side regardless. This limitation is acceptable for the initial implementation.

**Optional future improvement:** update the `source` pattern in `next.config.js` to exclude use-case page paths, allowing Cloudflare to cache the static HTML shell at the edge.

---

## Error Handling

- Unknown slug: `dynamicParams = false` returns 404 at framework level before reaching the page component. The runtime guard `if (!slugLocale)` is a secondary defense.
- Locale mismatch (e.g. `/en/correo-temporal-para-registros-web`): `getSlugLocale` returns `"es"` ≠ `"en"` → `notFound()`
- Invalid locale (e.g. `/fr/`): caught by `[locale]/layout.tsx` before page component runs

---

## Testing Checklist

- [ ] `next build` shows all 10 use-case URLs as `○` (static, not `λ` dynamic) in build output
- [ ] Unknown slug (e.g. `/es/correo-temporal-desconocido`) returns 404
- [ ] Locale mismatch (e.g. `/en/correo-temporal-para-registros-web`) returns 404
- [ ] Locale switcher link on each use-case page navigates to the correct alternate slug (e.g. ES→EN and EN→ES)
- [ ] hreflang ES↔EN correct on each page (validate in `view-source`)
- [ ] BreadcrumbList JSON-LD includes `"@context": "https://schema.org"` — validate with Google Rich Results Test
- [ ] OG image tag present in `<head>` on use-case pages
- [ ] Twitter card tags present in `<head>` on use-case pages
- [ ] `MailboxWidget` creates a mailbox and works identically on use-case pages and homepage
- [ ] Mobile layout at 375px width — widget + content sections stack correctly
- [ ] Word count per page ≥ 500 (title + intro + steps + why + faq combined)
