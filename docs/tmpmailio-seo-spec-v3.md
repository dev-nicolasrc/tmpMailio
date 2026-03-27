# TmpMail SEO — Spec de Implementación v3
**Sitio:** https://tmpmailio.com
**Auditoría:** 2026-03-25 (6 agentes en paralelo)
**Stack confirmado:** Next.js App Router · Cloudflare CDN · Tailwind CSS · next-intl · WebSocket nativo
**Puntuación actual:** 63/100 → **Objetivo:** 80+/100

> **Nota de versiones:**
> - v1 (2026-03-18): Mejoras de infraestructura base (ya desplegadas: Cloudflare, HTTP/2, HSTS preload)
> - v2 (2026-03-19): Issues de la segunda auditoría — **varios ítems de v2 aún sin implementar**, identificados abajo como `[v2 pendiente]`
> - v3 (2026-03-25): Este documento. Consolida los pendientes de v2 + todos los hallazgos nuevos de la auditoría del 25 de marzo.
>
> **Corrección importante vs v2:** El spec v2 recomendaba AÑADIR HowTo JSON-LD. Google eliminó permanentemente los rich results de HowTo en septiembre 2023. El bloque que actualmente existe en producción debe ser **eliminado**, no mejorado.

---

## Índice

| # | Sección | Prioridad máxima |
|---|---------|-----------------|
| 1 | [Infraestructura — Cloudflare edge caching](#1-infraestructura--cloudflare-edge-caching) | CRÍTICA |
| 2 | [Redirects y estructura de URLs](#2-redirects-y-estructura-de-urls) | CRÍTICA |
| 3 | [robots.txt](#3-robotstxt) | CRÍTICA |
| 4 | [Schema / Datos Estructurados](#4-schema--datos-estructurados) | CRÍTICA |
| 5 | [Metadata y On-Page SEO](#5-metadata-y-on-page-seo) | CRÍTICA |
| 6 | [Contenido y E-E-A-T — Landing pages](#6-contenido-y-e-e-a-t--landing-pages) | CRÍTICA |
| 7 | [Seguridad — CSP enforced](#7-seguridad--csp-enforced) | ALTA |
| 8 | [Rendimiento y Core Web Vitals](#8-rendimiento-y-core-web-vitals) | ALTA |
| 9 | [Sitemap XML](#9-sitemap-xml) | ALTA |
| 10 | [E-E-A-T — Autoridad y confianza](#10-e-e-a-t--autoridad-y-confianza) | ALTA |
| 11 | [Mobile y Accesibilidad](#11-mobile-y-accesibilidad) | MEDIA |
| 12 | [Contenido — Homepage y páginas secundarias](#12-contenido--homepage-y-páginas-secundarias) | MEDIA |
| 13 | [Checklist de implementación](#13-checklist-de-implementación) | — |
| 14 | [Métricas de seguimiento](#14-métricas-de-seguimiento) | — |

---

## 1. Infraestructura — Cloudflare edge caching

### 1.1 — Habilitar caché de HTML en el edge de Cloudflare

**Prioridad:** CRÍTICA
**Impacto estimado:** TTFB 540ms → <50ms; LCP -400ms+
**Contexto:** Toda la respuesta HTML tiene `cache-control: no-store` y `cf-cache-status: BYPASS`. Cloudflare no está sirviendo ningún HTML desde el edge — cada petición va hasta el origen. La shell HTML es **idéntica para todos los usuarios** (el email se genera en cliente después de la hidratación). No hay razón técnica para `no-store` en la shell.

**Paso 1 — Configurar cache-control en Next.js:**

```ts
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        // Páginas de locale — la shell HTML es pública y cacheable
        source: '/:locale(en|es)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Landing pages
        source: '/:locale(en|es)/:slug',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // API routes — nunca cachear
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ]
  },
}
```

**Paso 2 — Configurar Cloudflare Cache Rule:**

En el panel de Cloudflare → Caching → Cache Rules → Create Rule:
- **Condición:** `Hostname equals tmpmailio.com AND not starts with /api/`
- **Acción:** `Cache Level: Cache Everything`
- **Edge TTL:** `Override origin, 1 hour`
- **Browser TTL:** `Respect origin`

Esto asegura que Cloudflare cachea el HTML incluso si el origen envía headers conservadores.

**Paso 3 — Separar el componente de inbox del shell:**

El inbox (que sí debe ser dinámico) ya se genera en cliente vía WebSocket. Verificar que no haya ningún dato de usuario en el SSR HTML. Si `generate-email` o similar se llama en el servidor durante el render, moverlo a un `useEffect` o un Server Action llamado desde el cliente.

```tsx
// app/[locale]/page.tsx — asegurarse de que el SSR no incluye datos de sesión
// El placeholder del inbox debe ser estático:
// ✓ <div className="h-[440px] animate-pulse bg-neutral-900" />
// ✗ <div>{emailAddress}</div>  ← esto impide el caching
```

**Verificación:**
```bash
curl -I https://tmpmailio.com/en
# Debe mostrar:
# cf-cache-status: HIT  (o MISS en primera visita, luego HIT)
# cache-control: public, s-maxage=3600, stale-while-revalidate=86400
```

---

### 1.2 — Resolver route handler que devuelve HTTP 500 en /sitemap-index.xml

**Prioridad:** CRÍTICA (menor)
**Contexto:** `/sitemap_index.xml` y `/sitemap-index.xml` devuelven HTTP 500 (error de servidor). Esto genera noise en Search Console y puede penalizar la frecuencia de recrawl.

```ts
// app/sitemap-index.xml/route.ts  (o el equivalente en el App Router)
// Si la ruta no existe, eliminar el archivo o retornar 404:

import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse(null, { status: 404 })
}
```

Si el 500 viene de un catch de Next.js porque la ruta no tiene handler, crear el archivo de route con el 404 explícito. Verificar también `/sitemap-index.xml` (con guión, no guión bajo).

**Verificación:**
```bash
curl -I https://tmpmailio.com/sitemap_index.xml
curl -I https://tmpmailio.com/sitemap-index.xml
# Ambas deben devolver 404, no 500
```

---

## 2. Redirects y estructura de URLs

### 2.1 — Cambiar redirección raíz de 302 a 301 `[v2 pendiente]`

**Prioridad:** CRÍTICA
**Archivo:** `middleware.ts`
**Contexto:** `https://tmpmailio.com/` → `https://tmpmailio.com/en` devuelve HTTP 302. Una redirección temporal no consolida PageRank. La auditoría del 2026-03-25 confirma que este ítem de v2 **no ha sido implementado**.

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/en', request.url), 301)
    // ↑ Añadir { status: 301 } — sin esto Next.js usa 307/302 por defecto
  }

  // ... resto del middleware (locale detection, etc.)
}
```

**Alternativa con next.config.js (más simple):**
```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
        permanent: true,  // ← genera 308/301
      },
    ]
  },
}
```

**Verificación:**
```bash
curl -I https://tmpmailio.com/
# HTTP/2 301
# location: https://tmpmailio.com/en
```

---

### 2.2 — Redirigir www a apex domain con 301

**Prioridad:** ALTA
**Contexto:** `https://www.tmpmailio.com` redirige a `https://www.tmpmailio.com/en` (www → www), en lugar de `https://tmpmailio.com/en`. Existen dos orígenes accesibles (www + non-www) — riesgo de contenido duplicado aunque los canonicals apunten correctamente al apex.

**Configuración en Cloudflare (recomendada — no requiere código):**

Cloudflare → Rules → Redirect Rules → Create Rule:
- **Nombre:** `www to apex`
- **Condición:** `Hostname equals www.tmpmailio.com`
- **Acción:** `Static Redirect`
- **Redirect URL:** `https://tmpmailio.com${http.request.uri}`
- **Status code:** `301`

**Verificación:**
```bash
curl -I https://www.tmpmailio.com/en
# HTTP/2 301
# location: https://tmpmailio.com/en
```

---

## 3. robots.txt

### 3.1 — Resolver conflicto Cloudflare vs site-operator `[v2 pendiente]`

**Prioridad:** CRÍTICA
**Contexto:** El bloque gestionado por Cloudflare (primeras líneas) emite `Disallow: /` para `ClaudeBot` y `GPTBot`. El bloque del operador del sitio (más abajo) los re-autoriza con `Allow: /`. **El primer bloque encontrado gana** según el spec de robots.txt — los Allow están siendo ignorados. La auditoría del 2026-03-25 confirma que este conflicto **persiste sin corregir**.

Adicionalmente: `Google-Extended` está bloqueado con `Disallow: /`. Este bot gestiona la elegibilidad de AI Overviews de Google. Bloquearlo excluye al sitio de los resultados generados por IA de Google.

**Decisión requerida antes de implementar:**

| Bot | Recomendación | Razón |
|-----|--------------|-------|
| `GPTBot` | Allow | Elegibilidad en ChatGPT web search |
| `ClaudeBot` | Allow | Elegibilidad en Claude AI search |
| `PerplexityBot` | Allow | Ya está permitido en el bloque actual |
| `Google-Extended` | **Allow** (recomendado) | Elegibilidad en AI Overviews de Google. Bloquearlo = exclusión de SGE |
| `Amazonbot` | Disallow | Scraping sin beneficio SEO claro |
| `Bytespider` | Disallow | TikTok crawler agresivo |
| `CCBot` | Disallow | Common Crawl — entrenamiento de LLMs sin beneficio SEO |

**Solución A — Configurar en Cloudflare Dashboard (recomendada):**
1. Cloudflare → Security → Bots → AI Scrapers & Crawlers
2. Desactivar el bloqueo para GPTBot, ClaudeBot y Google-Extended individualmente
3. Cloudflare dejará de inyectar esas reglas en el robots.txt

**Solución B — Servir robots.txt estático desde `public/robots.txt`:**

Si el archivo `public/robots.txt` de Next.js tiene precedencia sobre el gestionado por Cloudflare, usar este contenido:

```txt
# TmpMail robots.txt
# Última actualización: 2026-03-25

User-agent: *
Allow: /
Disallow: /api/
Disallow: /internal/

# Search engine AI crawlers — allowed for AI Overviews and AI search eligibility
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# Data broker and aggressive scrapers — blocked
User-agent: Amazonbot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

Sitemap: https://tmpmailio.com/sitemap.xml
```

**Verificación:**
```bash
curl https://tmpmailio.com/robots.txt
# Verificar: solo debe aparecer UN bloque por User-agent
# GPTBot y ClaudeBot deben tener Allow: / sin Disallow previo
# No debe haber sección "Cloudflare Managed" con Disallow: / para estos bots
```

---

## 4. Schema / Datos Estructurados

### 4.1 — Eliminar bloque HowTo JSON-LD (DEPRECADO)

**Prioridad:** CRÍTICA
**Archivo:** `app/[locale]/page.tsx` (o donde esté definido el bloque HowTo)
**Contexto:** Google eliminó permanentemente los rich results de HowTo en **septiembre 2023**. El bloque actualmente en producción genera cero beneficio en SERPs. Además, todos los `HowToStep` del bloque actual carecen de las propiedades `name` y `url`, haciendo el bloque técnicamente inválido incluso bajo la spec pre-depreciación.

> **Corrección vs spec v2:** La v2 recomendaba añadir/mejorar HowTo. Esto era incorrecto. El bloque debe ser eliminado.

**Cambio:**

```tsx
// app/[locale]/page.tsx — ELIMINAR este bloque completamente:
// <script type="application/ld+json">
//   { "@type": "HowTo", ... }
// </script>

// El contenido de "Cómo funciona" puede permanecer en el HTML como lista ordenada
// — Google lo indexa correctamente sin schema markup
```

El contenido HTML del "How it works" puede y debe mantenerse como `<ol>` con `<li>` — es útil para el usuario y para extracción de contenido por AI crawlers. Solo se elimina el JSON-LD wrapper.

**Verificación:**
```bash
curl -s https://tmpmailio.com/en | python3 -c "
import sys, json, re
html = sys.stdin.read()
schemas = re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s)
    if d.get('@type') == 'HowTo':
        print('ERROR: HowTo schema aún presente')
print('OK: No HowTo schema found')
"
```

---

### 4.2 — Eliminar FAQPage JSON-LD de output de Google (mantener para Bing)

**Prioridad:** ALTA
**Contexto:** Google restringió los rich results de FAQPage a sitios gubernamentales y de salud en **agosto 2023**. Para TmpMail, Google ignora silenciosamente este bloque. Sin embargo, **Bing sigue renderizando FAQPage** para cualquier sitio. La solución ideal es mantenerlo para Bing sin desperdiciarlo en la respuesta de Google.

**Opción A — Eliminación total (más simple):**
Si el objetivo es solo Google, eliminar el bloque. El contenido FAQ en HTML sigue siendo válido para extracción por AI crawlers.

**Opción B — Mantener para Bing, excluir de validación de Google:**
Mantener el bloque en el HTML (Bing lo procesa). En Google Search Console, ignorar las advertencias de FAQPage — no afectan rankings.

**Recomendación:** Mantener el FAQPage JSON-LD en el HTML (Opción B). El contenido FAQ estructurado sigue siendo la señal más directa para que ChatGPT, Perplexity y Claude AI extraigan respuestas citables. El costo de mantenerlo es cero; el beneficio para AI search es alto.

**Si se mantiene, verificar calidad del bloque:**

```ts
// lib/schema/faq.ts — asegurarse de que cada Q&A tiene contenido específico y citable
// Las respuestas deben contener hechos verificables (duración, límites, política)
// Ejemplo de respuesta de calidad:
{
  "@type": "Question",
  "name": "How long does a temporary email last?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "Your TmpMail address lasts 10 minutes from creation. Each new email received resets the timer by adding 5 minutes. The inbox and all messages are permanently deleted when the timer expires — no manual action required."
  }
}
// ✓ Contiene duración exacta (10 min), comportamiento específico (reset +5 min), acción (automático)
// ✗ Evitar respuestas genéricas como "It lasts a short time and then expires"
```

---

### 4.3 — Mejorar WebApplication schema: añadir screenshot, featureList, fechas

**Prioridad:** ALTA
**Archivo:** Donde esté definido el bloque WebApplication
**Contexto:** `screenshot` es la propiedad con mayor impacto en la elegibilidad de rich results para WebApplication. `datePublished` y `dateModified` afectan las señales de frescura.

```ts
// lib/schema/webapp.ts
export function buildWebAppSchema(locale: 'es' | 'en') {
  const content = {
    en: {
      name: 'TmpMail',
      description: 'Free disposable temporary email service. Create a throwaway email address in seconds — no registration, no password, auto-expires in 10 minutes.',
      featureList: 'Instant disposable email generation, No registration or password required, Inbox auto-expires in 10 minutes, Real-time email delivery via WebSocket, Attachment support up to 5MB, QR Code generation for mobile sharing, Available in English and Spanish, Privacy-first: no IP or personal data stored',
    },
    es: {
      name: 'TmpMail',
      description: 'Servicio gratuito de correo temporal desechable. Crea una dirección de email temporal en segundos — sin registro, sin contraseña, expira automáticamente en 10 minutos.',
      featureList: 'Generación instantánea de email desechable, Sin registro ni contraseña requeridos, Inbox expira automáticamente en 10 minutos, Entrega de emails en tiempo real vía WebSocket, Soporte de adjuntos hasta 5MB, Generación de código QR para compartir en móvil, Disponible en inglés y español, Privacidad total: no se almacena IP ni datos personales',
    },
  }

  const c = content[locale]

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `https://tmpmailio.com/${locale}/#webapp`,
    'name': c.name,
    'url': `https://tmpmailio.com/${locale}`,
    'description': c.description,
    'applicationCategory': 'Utilities',
    'operatingSystem': 'Any web browser',
    'browserRequirements': 'Requires JavaScript. Compatible with Chrome, Firefox, Safari, Edge.',
    'isAccessibleForFree': true,
    'inLanguage': locale,
    'datePublished': '2024-01-01',
    'dateModified': '2026-03-19',   // ← actualizar con cada deploy de contenido
    'screenshot': {
      '@type': 'ImageObject',
      'url': `https://tmpmailio.com/${locale}/opengraph-image`,
      'caption': locale === 'en'
        ? 'TmpMail temporary email inbox interface — generate a disposable email in seconds'
        : 'Interfaz del inbox de correo temporal TmpMail — genera un email desechable en segundos',
    },
    'featureList': c.featureList,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
      'availability': 'https://schema.org/InStock',
    },
    'publisher': {
      '@type': 'Organization',
      '@id': 'https://tmpmailio.com/#organization',
    },
  }
}
```

---

### 4.4 — Añadir sameAs y completar Organization schema

**Prioridad:** ALTA
**Contexto:** Sin `sameAs`, Google y los sistemas de AI no pueden asociar la entidad "TmpMail" con ningún perfil externo verificable. Esto suprime la elegibilidad para Knowledge Panel y reduce la citabilidad en AI search. `description` y `foundingDate` también faltan.

```ts
// lib/schema/organization.ts
export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://tmpmailio.com/#organization',
    'name': 'TmpMail',
    'alternateName': 'TmpMailio',
    'url': 'https://tmpmailio.com',
    'description': 'TmpMail provides free disposable temporary email addresses. No registration required. Addresses expire automatically to protect user privacy. GDPR-compliant, EU-hosted.',
    'foundingDate': '2024',
    'logo': {
      '@type': 'ImageObject',
      'url': 'https://tmpmailio.com/icon.png',
      'width': 512,
      'height': 512,
    },
    // ← AÑADIR: perfiles externos verificables
    'sameAs': [
      // Añadir las URLs reales de los perfiles del proyecto:
      // 'https://github.com/TU_ORG/tmpmailio',
      // 'https://www.producthunt.com/products/tmpmail',
      // 'https://twitter.com/TU_HANDLE',
    ],
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'customer support',
      'email': 'contacto@tmpmailio.com',
      'availableLanguage': ['English', 'Spanish'],
    },
    'privacyPolicy': 'https://tmpmailio.com/en/privacy',
    'termsOfService': 'https://tmpmailio.com/en/terms',
  }
}
```

> **Nota:** El array `sameAs` debe completarse con URLs reales. Crear los perfiles en GitHub (org), ProductHunt y al menos una red social antes de publicar este schema.

---

### 4.5 — Añadir SearchAction a WebSite schema

**Prioridad:** MEDIA
**Contexto:** El schema WebSite actual carece de `potentialAction`. Añadirlo activa la elegibilidad para **Sitelinks Searchbox** en Google Search — un bloque de búsqueda directa en la ficha del sitio en los SERPs.

```ts
// lib/schema/website.ts
export function buildWebSiteSchema(locale: 'es' | 'en') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `https://tmpmailio.com/#website`,
    'name': 'TmpMail',
    'url': 'https://tmpmailio.com',
    'inLanguage': [locale],
    'publisher': {
      '@type': 'Organization',
      '@id': 'https://tmpmailio.com/#organization',
    },
    // AÑADIR:
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `https://tmpmailio.com/${locale}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}
// Nota: Solo añadir SearchAction si existe una funcionalidad de búsqueda real en el sitio.
// Si no existe, omitir — Google penaliza el uso de SearchAction sin endpoint funcional.
```

---

### 4.6 — Implementar BreadcrumbList de 2+ niveles en páginas internas `[v2 pendiente]`

**Prioridad:** MEDIA
**Archivos:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx`, `app/[locale]/[slug]/page.tsx`

Un BreadcrumbList de un solo elemento (el que existe actualmente en homepage) es inerte para rich results. Google requiere al menos 2 elementos para mostrarlo en SERPs.

```ts
// lib/schema/breadcrumb.ts
export function buildBreadcrumbSchema(locale: string, pageName: string, pageSlug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': [
      {
        '@type': 'ListItem',
        'position': 1,
        'name': 'TmpMail',
        'item': `https://tmpmailio.com/${locale}`,
      },
      {
        '@type': 'ListItem',
        'position': 2,
        'name': pageName,
        'item': `https://tmpmailio.com/${locale}/${pageSlug}`,
      },
    ],
  }
}

// Uso:
// buildBreadcrumbSchema('en', 'Privacy Policy', 'privacy')
// buildBreadcrumbSchema('en', 'Temporary Email for Web Signups', 'temporary-email-for-web-signups')
```

**Eliminar el BreadcrumbList de un elemento de la homepage** — no aporta nada y es ruido en el HTML.

---

## 5. Metadata y On-Page SEO

### 5.1 — Corregir meta descriptions duplicadas en Contact y Privacy

**Prioridad:** CRÍTICA
**Contexto:** Las páginas `/en/contact` y `/en/privacy` usan exactamente la misma meta description que la homepage. Un evaluador de calidad que visite ambas páginas lo identifica de inmediato como un build de baja inversión editorial.

**Archivo:** `app/[locale]/contact/page.tsx` y `app/[locale]/privacy/page.tsx` — función `generateMetadata`

```tsx
// app/[locale]/contact/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const isEn = params.locale === 'en'
  return {
    title: isEn
      ? 'Contact TmpMail — Support & Feedback'
      : 'Contacto TmpMail — Soporte y Sugerencias',
    description: isEn
      ? 'Contact the TmpMail team for technical support, abuse reports, or feedback. We respond within 24–48 hours.'
      : 'Contacta al equipo de TmpMail para soporte técnico, reportes de abuso o sugerencias. Respondemos en 24–48 horas.',
  }
}

// app/[locale]/privacy/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const isEn = params.locale === 'en'
  return {
    title: isEn
      ? 'Privacy Policy — TmpMail'
      : 'Política de Privacidad — TmpMail',
    description: isEn
      ? 'TmpMail stores no personal data, no IP addresses, and no email content. GDPR-compliant. All messages deleted automatically on expiry.'
      : 'TmpMail no almacena datos personales, IP ni contenido de emails. Cumple GDPR. Todos los mensajes se eliminan automáticamente al expirar.',
  }
}
```

**Verificar también las páginas de terms y about** — si comparten la misma meta description, aplicar el mismo fix.

---

### 5.2 — Mejorar títulos de páginas utilitarias

**Prioridad:** MEDIA
**Contexto:** Los títulos de About, Contact, Privacy y Terms son genéricos (16–24 caracteres) y desperdician el espacio de keyword. Además, dos títulos de landing pages incluyen el nombre de marca dos veces.

```tsx
// Títulos actuales → títulos propuestos

// About (24 chars) → About TmpMail | TmpMail
// Propuesta (EN, 62 chars):
"About TmpMail — Privacy-First Disposable Email Service"

// About (ES):
"Sobre TmpMail — Servicio de Email Temporal con Privacidad"

// Contact (18 chars):
// EN: "Contact TmpMail — Get Support in 24–48 Hours"
// ES: "Contacto TmpMail — Soporte en 24–48 Horas"

// Privacy (18 chars):
// EN: "Privacy Policy — TmpMail | No Data Stored, GDPR Compliant"
// ES: "Política de Privacidad — TmpMail | RGPD, Sin Datos Almacenados"

// Landing pages con marca duplicada:
// "Avoid Email Spam with TmpMail | TmpMail" → "Avoid Email Spam with a Disposable Email | TmpMail"
// "Protect Your Email Privacy with TmpMail | TmpMail" → "Protect Email Privacy with Disposable Email | TmpMail"
```

---

### 5.3 — Diversificar el keywords meta tag por página

**Prioridad:** BAJA
**Contexto:** El string `"temporary email,disposable email,throwaway email,anonymous email,temp mail,free temporary inbox"` es idéntico en las 10 páginas (5 EN + 5 ES). Google no usa este tag para ranking, pero los evaluadores manuales de calidad lo ven como señal de contenido templado.

```tsx
// generateMetadata de cada landing page — añadir keywords específicas al tema:

// /en/temporary-email-for-web-signups
keywords: 'temporary email for signups, fake email for registration, disposable email sign up, burner email web forms'

// /en/avoid-email-spam
keywords: 'avoid email spam, stop spam email, disposable email spam protection, throwaway email newsletter'

// /en/protect-email-privacy
keywords: 'protect email privacy, anonymous email, private email address, no tracking email'

// /en/temporary-email-social-media
keywords: 'temporary email social media, disposable email twitter, fake email instagram, burner email facebook'

// /en/disposable-email-no-registration
keywords: 'disposable email no registration, instant temporary email, no signup email, email without account'
```

---

## 6. Contenido y E-E-A-T — Landing pages

### 6.1 — Expandir las 5 landing pages a contenido sustantivo

**Prioridad:** CRÍTICA
**Contexto:** Cada landing page tiene ~200–220 palabras de prosa única en una plantilla idéntica (H2 "How to", H2 "Why", H2 "FAQ" con exactamente 2 preguntas). Esto es contenido delgado según la QRG de septiembre 2025. El mínimo para una service/landing page es 600–800 palabras.

**Estructura objetivo por landing page:**

```
H1: [Keyword principal — única por página]

[Párrafo intro: 100-150 palabras — el problema específico que resuelve esta página]

H2: How [use case] Works with a Temporary Email
  [Explicación técnica del flujo: 150-200 palabras]
  <ol>
    <li> Paso 1 (con contexto específico al caso de uso)</li>
    <li> Paso 2</li>
    <li> ... (mínimo 5 pasos con texto sustantivo)</li>
  </ol>

H2: Why Use a Disposable Email for [use case]
  H3: [Beneficio específico 1 — único a este use case]
    [100 palabras]
  H3: [Beneficio específico 2]
    [100 palabras]
  H3: [Diferencia vs alternativas (email alias, plus-addressing)]
    [80 palabras]

H2: Real-World Scenarios
  [2-3 escenarios concretos, con nombre de servicios reales donde aplica]
  [150 palabras]

H2: Frequently Asked Questions
  [Mínimo 5 preguntas específicas a este use case — NO las mismas preguntas de la homepage]
  H3: [Pregunta 1] → Respuesta detallada (50-80 palabras)
  H3: [Pregunta 2] → ...
  H3: [Pregunta 3] → ...
  H3: [Pregunta 4] → ...
  H3: [Pregunta 5] → ...
```

**Requerimientos de diferenciación por página:**

| Página | Contenido único requerido |
|--------|--------------------------|
| `/temporary-email-for-web-signups` | Explicar verification email flows, por qué los forms de registro rastrean el email, cómo los servicios SaaS usan el email para retargeting |
| `/avoid-email-spam` | Explicar cómo funcionan las listas de spam, opt-out mechanics, diferencia entre spam transaccional vs marketing, GDPR unsubscribe rights |
| `/protect-email-privacy` | Explicar data brokers, email harvesting, pixel tracking en emails, diferencia con email masking services como SimpleLogin |
| `/temporary-email-social-media` | Casos específicos: crear cuentas secundarias en Twitter/X, Instagram, Discord; políticas de múltiples cuentas; qué pasa cuando la cuenta pide verificación posterior |
| `/disposable-email-no-registration` | Comparar con servicios que requieren registro (Mailinator requiere cuenta para emails persistentes), casos donde la inmediatez es clave (beta testing, voting systems) |

---

### 6.2 — Añadir H3 subheadings en todas las páginas

**Prioridad:** MEDIA
**Contexto:** Ninguna página del sitio tiene estructura H3. Google usa la jerarquía H1→H2→H3 para comprender la arquitectura del contenido. Los sistemas de AI (AI Overviews, Perplexity, Claude) extraen respuestas preferentemente de secciones con heading explícito.

**Regla:** Cada H2 que contenga más de 100 palabras de contenido debe tener al menos 2 H3 subheadings que dividan el contenido en subtemas específicos.

```tsx
// Ejemplo para la sección FAQ de la homepage:
<h2>Frequently Asked Questions</h2>
  <h3>How long does a temporary email address last?</h3>
  <p>Your TmpMail address lasts 10 minutes...</p>

  <h3>Can I receive attachments?</h3>
  <p>Yes, TmpMail supports attachments up to 5MB...</p>

  <h3>Is a disposable email safe to use?</h3>
  <p>...</p>
```

---

## 7. Seguridad — CSP enforced

### 7.1 — Activar Content-Security-Policy en modo enforced `[v2 pendiente]`

**Prioridad:** ALTA
**Contexto:** La auditoría del 2026-03-25 confirma que la CSP sigue en `report-only`. Este ítem de v2 **no ha sido implementado**.

**Pasos:**

1. Acceder al endpoint de reportes (`/api/csp-report`) y revisar todas las violaciones registradas desde la última auditoría.
2. Para cada violación legítima (scripts de AdSense, WebSocket a `api.tmpmailio.com`), añadir la fuente a la política.
3. Reemplazar `'unsafe-inline'` en `script-src` con nonces:

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(uuidv4()).toString('base64')

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://pagead2.googlesyndication.com https://www.googletagservices.com`,
    `style-src 'self' 'unsafe-inline'`,   // Tailwind requiere inline styles
    `font-src 'self'`,
    `img-src 'self' data: blob: https:`,
    `connect-src 'self' wss://api.tmpmailio.com https://api.tmpmailio.com`,
    `frame-src https://googleads.g.doubleclick.net`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `report-uri /api/csp-report`,
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // CAMBIO: de report-only a enforced
  response.headers.set('content-security-policy', csp)
  response.headers.delete('content-security-policy-report-only')

  return response
}
```

```tsx
// app/layout.tsx — el script de detección de tema necesita el nonce
import { headers } from 'next/headers'

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: themeDetectionScript }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Verificación:**
```bash
curl -I https://tmpmailio.com/en | grep -i "content-security-policy"
# Debe mostrar: content-security-policy: default-src ...
# NO debe aparecer "report-only"
```

---

## 8. Rendimiento y Core Web Vitals

### 8.1 — Eliminar opacity:0 + delay de la animación heroFadeIn en el H1

**Prioridad:** ALTA
**Impacto:** LCP -100–200ms
**Contexto:** El H1 es el candidato LCP de la página. La animación CSS `heroFadeIn` aplica `opacity: 0` con `animation-delay: 0.1s`. El browser no registra LCP hasta que el elemento es visible — el delay añade directamente ~100ms al LCP.

**Archivo:** CSS global o el componente hero

```css
/* ANTES: */
@keyframes heroFadeIn {
  0% {
    opacity: 0;
    transform: translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-title {
  animation: heroFadeIn 0.4s ease forwards;
  animation-delay: 0.1s;   /* ← Este delay retrasa el LCP */
}

/* DESPUÉS — dos opciones: */

/* Opción A: Eliminar el delay y asegurarse de que el elemento empieza visible */
.hero-title {
  animation: heroFadeIn 0.3s ease forwards;
  /* Sin animation-delay */
}

@keyframes heroFadeIn {
  from { transform: translateY(6px); opacity: 0.8; }  /* No empieza en opacity:0 */
  to   { transform: translateY(0);   opacity: 1; }
}

/* Opción B (recomendada): Solo animar transform, nunca opacity en el LCP element */
.hero-title {
  animation: heroSlideIn 0.3s ease forwards;
}

@keyframes heroSlideIn {
  from { transform: translateY(8px); }
  to   { transform: translateY(0); }
}

/* Siempre respetar prefers-reduced-motion: */
@media (prefers-reduced-motion: reduce) {
  .hero-title { animation: none; }
}
```

---

### 8.2 — Añadir preconnect para AdSense + reservar dimensiones de slots

**Prioridad:** ALTA
**Contexto:** El script de AdSense está preloaded pero no hay `<link rel="preconnect">` al dominio de AdSense. El tiempo de DNS + TLS handshake para `pagead2.googlesyndication.com` se realiza en el momento del fetch, no antes. Además, los slots de anuncios inyectados dinámicamente sin dimensiones reservadas son la causa más común de CLS.

**Archivo:** `app/layout.tsx` o `app/[locale]/layout.tsx`

```tsx
// Añadir en el <head>:
<link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
<link rel="preconnect" href="https://googleads.g.doubleclick.net" crossOrigin="anonymous" />

// ELIMINAR esta línea inútil (preconnect al propio origen):
// <link rel="preconnect" href="https://tmpmailio.com" />
```

**Reservar dimensiones para cada slot de AdSense:**

```tsx
// Para cada contenedor de anuncio — añadir min-height fijo ANTES de que cargue el ad:
<div className="w-full" style={{ minHeight: '90px' }}>   {/* leaderboard */}
  <ins className="adsbygoogle" ... />
</div>

<div style={{ minHeight: '250px', minWidth: '300px' }}>   {/* medium rectangle */}
  <ins className="adsbygoogle" ... />
</div>
```

---

### 8.3 — Lazy-load AdSense después de la interacción del usuario

**Prioridad:** ALTA
**Contexto:** `adsbygoogle.js` (~80KB comprimido) se inicializa en `<head>` con `rel="preload"`. AdSense es el mayor contribuyente a INP en páginas con interactividad, ya que ejecuta tareas largas en el main thread durante el auction.

**Archivo:** Donde se inicialice AdSense (probablemente `app/layout.tsx` o un componente `<AdSense />`)

```tsx
// components/AdSense.tsx
'use client'
import { useEffect } from 'react'

export function AdSense() {
  useEffect(() => {
    // Solo cargar AdSense después de que el usuario ha interactuado o hay tiempo idle
    const loadAds = () => {
      const script = document.createElement('script')
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
      script.async = true
      script.dataset.adClient = 'ca-pub-2594577923637858'
      document.head.appendChild(script)
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadAds, { timeout: 3000 })
    } else {
      setTimeout(loadAds, 3000)
    }
  }, [])

  return null
}
```

```tsx
// app/layout.tsx — eliminar el <link rel="preload"> de AdSense del <head>:
// ✗ <link rel="preload" href="https://pagead2.googlesyndication.com/..." as="script" />

// Y usar el componente lazy en su lugar:
// ✓ <AdSense />  ← se carga con requestIdleCallback
```

---

### 8.4 — Verificar altura del skeleton igual al widget hidratado

**Prioridad:** MEDIA
**Contexto:** El skeleton del email address usa `h-[60px]` con `animate-pulse`. Si el widget hidratado tiene una altura diferente a 60px, se produce CLS en el momento de hidratación.

**Acción:**
1. Inspeccionar el email address widget en DevTools después de hidratación completa.
2. Medir la altura real renderizada del componente.
3. Si difiere de 60px, actualizar el skeleton: `h-[XXpx]` donde XX es la altura real.

```tsx
// Ejemplo — si el widget hidratado tiene 52px de altura:
// ANTES:
<div className="h-[60px] animate-pulse bg-neutral-900 rounded" />

// DESPUÉS:
<div className="h-[52px] animate-pulse bg-neutral-900 rounded" />
```

---

## 9. Sitemap XML

### 9.1 — Añadir landing pages y corregir lastmod `[v2 pendiente extendido]`

**Prioridad:** ALTA
**Contexto:** El sitemap tiene 20 URLs con `lastmod: 2026-03-19` idéntico para todas. Google descuenta el valor de lastmod cuando todos los URLs tienen la misma fecha estática.

**Archivo:** `app/sitemap.ts`

```ts
import { MetadataRoute } from 'next'

const BASE = 'https://tmpmailio.com'
const LOCALES = ['en', 'es'] as const

// Fechas reales de última modificación de contenido — actualizar manualmente con cada deploy
const DATES: Record<string, string> = {
  home:                                   '2026-03-19',
  privacy:                                '2026-02-10',
  terms:                                  '2026-02-10',
  contact:                                '2026-01-20',
  about:                                  '2026-01-20',
  'temporary-email-for-web-signups':      '2026-03-19',
  'avoid-email-spam':                     '2026-03-19',
  'protect-email-privacy':               '2026-03-19',
  'temporary-email-social-media':         '2026-03-19',
  'disposable-email-no-registration':     '2026-03-19',
}

// Slugs en español para las landing pages (si se usan slugs traducidos)
const ES_SLUGS: Record<string, string> = {
  'temporary-email-for-web-signups':      'email-temporal-registros-web',
  'avoid-email-spam':                     'evitar-spam-correo-personal',
  'protect-email-privacy':               'proteger-privacidad-correo',
  'temporary-email-social-media':         'email-temporal-redes-sociales',
  'disposable-email-no-registration':     'email-desechable-sin-registro',
}

function hreflang(enPath: string, esPath: string) {
  return {
    'x-default': `${BASE}/en${enPath}`,
    en: `${BASE}/en${enPath}`,
    es: `${BASE}/es${esPath}`,
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  const staticPages = ['home', 'privacy', 'terms', 'contact', 'about']
  const landingPages = [
    'temporary-email-for-web-signups',
    'avoid-email-spam',
    'protect-email-privacy',
    'temporary-email-social-media',
    'disposable-email-no-registration',
  ]

  for (const locale of LOCALES) {
    // Páginas estáticas
    for (const page of staticPages) {
      const path = page === 'home' ? '' : `/${page}`
      entries.push({
        url: `${BASE}/${locale}${path}`,
        lastModified: DATES[page],
        alternates: { languages: hreflang(path, path) },
      })
    }

    // Landing pages (con slugs traducidos para ES)
    for (const slug of landingPages) {
      const enPath = `/${slug}`
      const esPath = `/${ES_SLUGS[slug] ?? slug}`
      const path = locale === 'en' ? enPath : esPath
      entries.push({
        url: `${BASE}/${locale}${path}`,
        lastModified: DATES[slug],
        alternates: { languages: hreflang(enPath, esPath) },
      })
    }
  }

  return entries
}
```

> **Proceso operativo:** Cada vez que se actualiza el contenido de una página, actualizar manualmente la fecha en el objeto `DATES` antes del deploy. No usar `new Date()` — genera una fecha nueva en cada build aunque el contenido no haya cambiado.

---

## 10. E-E-A-T — Autoridad y confianza

### 10.1 — Añadir identidad organizacional verificable a la página About

**Prioridad:** ALTA
**Contexto:** Bajo GDPR Artículo 13, el responsable del tratamiento debe ser identificado como persona física o jurídica — "TmpMailio" es un nombre comercial, no una entidad legal. Bajo la QRG de septiembre 2025, la ausencia de cualquier individuo o entidad legal con nombre reduce significativamente el Trust Score para servicios que gestionan datos de usuario.

**Cambios en la página About:**

```tsx
// app/[locale]/about/page.tsx — añadir al contenido:

// 1. Entidad legal o equipo nombrado:
// "TmpMail is operated by [Nombre Legal de la Empresa], registered in [País]."
// O si es un proyecto personal: "TmpMail is built and maintained by [Nombre/Pseudónimo], [país]."

// 2. Historia de origen (1-2 párrafos):
// Por qué se construyó el servicio, qué problema personal resolvía, cuándo empezó

// 3. Decisiones técnicas con contexto:
// "We chose Redis in-memory storage specifically because..."
// "We use Mail.tm as our infrastructure provider because..."

// 4. GDPR data controller statement:
// "The data controller under GDPR is [Nombre Legal], [Dirección], [País]."
// "For data-related requests, contact: privacy@tmpmailio.com"
```

---

### 10.2 — Mostrar email de contacto directamente en la página Contact

**Prioridad:** MEDIA
**Contexto:** La página Contact solo tiene un formulario. El email `contacto@tmpmailio.com` existe en el Organization schema pero no es visible en el HTML de la página. Los evaluadores de calidad y usuarios avanzados buscan contacto directo — solo un form puede señalar baja accesibilidad al soporte.

```tsx
// app/[locale]/contact/page.tsx — añadir visible en el HTML:
<p>
  You can also reach us directly at{' '}
  <a href="mailto:contacto@tmpmailio.com">contacto@tmpmailio.com</a>
  {' '}— we respond within 24–48 hours.
</p>
```

---

### 10.3 — Añadir señal de prueba social mínima

**Prioridad:** BAJA (alto impacto a largo plazo)
**Contexto:** TmpMail compite directamente con Guerrilla Mail, 10 Minute Mail y Mailinator — servicios con 5–15 años de historial, artículos de Wikipedia y extensos perfiles de citación externa. El único mecanismo disponible en el corto plazo para acumular autoridad es establecer presencia en plataformas indexadas.

**Acciones concretas:**

1. **GitHub:** Crear una organización GitHub pública o repositorio público para TmpMail (aunque sea solo documentación o el cliente web). GitHub es indexado por Google y aparece en sameAs.
2. **ProductHunt:** Publicar el producto en ProductHunt. El perfil de PH es indexado y linkado desde sameAs.
3. **Al menos una red social activa:** Twitter/X o Mastodon — suficiente con una cuenta verificable.
4. Una vez creados, añadir todas las URLs al array `sameAs` del Organization schema (ver 4.4).

---

## 11. Mobile y Accesibilidad

### 11.1 — Aumentar tap targets del language toggle y theme toggle

**Prioridad:** MEDIA
**Contexto:** El botón ES (selector de idioma) mide ~36×28px y el theme toggle ~36×30px. Google requiere un mínimo de 48×48dp. Estos aparecerán en el reporte de Mobile Usability de Search Console.

**Archivo:** Componente de header/nav

```tsx
// ANTES — tamaño insuficiente:
<button className="px-2 py-1 text-xs">ES</button>

// DESPUÉS — mínimo 48×48px:
<button className="min-h-[48px] min-w-[48px] px-3 py-2 text-xs flex items-center justify-center">
  ES
</button>

// Lo mismo para el theme toggle:
<button className="min-h-[48px] min-w-[48px] flex items-center justify-center p-3">
  {/* icono sol/luna */}
</button>
```

---

### 11.2 — Aumentar texto de botones y FAQ de text-xs (12px) a text-sm (14px)

**Prioridad:** MEDIA
**Contexto:** Múltiples elementos usan `text-xs` (12px). Google recomienda un mínimo de 16px para cuerpo de texto. Los elementos afectados son: labels de botones de acción, texto de respuestas FAQ, y spans de metadatos.

```tsx
// Componentes afectados — reemplazar text-xs por text-sm en:
// 1. Labels de botones secundarios
// 2. Texto de respuestas en el acordeón FAQ
// 3. Spans descriptivos ("// correo temporal", "// temporary email")

// Elemento puramente decorativo (puede mantener text-xs):
// - Números de pasos
// - Separadores tipográficos
```

---

### 11.3 — Corregir PWA manifest: start_url y lang

**Prioridad:** MEDIA
**Contexto:** `manifest.json` tiene `start_url: "/es"` y `lang: "es"`. Los usuarios que instalan el PWA desde la versión inglesa verían la pantalla de inicio en español.

```json
// public/manifest.json — versión corregida para el manifest general:
{
  "name": "TmpMail",
  "short_name": "TmpMail",
  "start_url": "/en",
  "lang": "en",
  "display": "standalone",
  "background_color": "#080808",
  "theme_color": "#080808",
  "icons": [...]
}
```

**Opción mejorada — manifests localizados:**

```tsx
// app/[locale]/layout.tsx
// Servir un manifest diferente por locale:
<link rel="manifest" href={`/manifest.${locale}.json`} />

// public/manifest.en.json → start_url: "/en", lang: "en"
// public/manifest.es.json → start_url: "/es", lang: "es"
```

---

### 11.4 — Añadir skip-to-content link

**Prioridad:** BAJA
**Contexto:** No existe un enlace de "saltar al contenido". Es un requerimiento de accesibilidad (WCAG 2.1 AA) y también una señal de calidad editorial.

```tsx
// app/layout.tsx — primer elemento del <body>:
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-2 focus:bg-black focus:text-white focus:rounded"
>
  Skip to main content
</a>

// En el componente main:
<main id="main-content">
  {children}
</main>
```

---

## 12. Contenido — Homepage y páginas secundarias

### 12.1 — Expandir prosa de la homepage a 500+ palabras

**Prioridad:** MEDIA
**Contexto:** La homepage tiene ~369 palabras de prosa visible. El mínimo para una homepage de herramienta SaaS es 500 palabras para pasar los umbrales de contenido delgado.

**Secciones a añadir/expandir:**

```tsx
// Después de la sección "Why use a disposable temporary email" — añadir:

<section>
  <h2>Who Uses Temporary Email?</h2>
  <p>
    Developers testing signup flows and verification systems. Journalists protecting source
    communications. Privacy-conscious users avoiding corporate email harvesting. Anyone
    registering for a one-time service, promotion, or download without wanting follow-up emails.
    Over 5 million emails have been generated through TmpMail since 2024.
  </p>
</section>

<section>
  <h2>TmpMail vs Other Disposable Email Services</h2>
  <p>
    Unlike Guerrilla Mail or Mailinator, TmpMail requires no account, no CAPTCHA, and stores
    nothing on disk — all messages live in Redis memory and are gone when your session expires.
    Unlike email alias services (SimpleLogin, AnonAddy), there is no permanent inbox to manage,
    no subscription, and no risk of the alias being traced back to your real identity.
  </p>
</section>
```

---

### 12.2 — Mejorar la página About con historia de origen y decisiones técnicas

**Prioridad:** MEDIA
**Contexto:** La página About tiene ~280 palabras con información funcional pero sin narrativa de origen, sin comparación con alternativas y sin razón por la que alguien debería confiar en este servicio sobre los competidores establecidos.

**Estructura objetivo:**

```
H1: About TmpMail — Privacy-First Disposable Email

H2: Why TmpMail Exists
  [Historia personal/motivación — 150 palabras]
  [El problema que resolvía — concreto, no genérico]

H2: How TmpMail Works — Under the Hood
  H3: In-memory storage with Redis
    [Explicación técnica de por qué Redis, por qué no PostgreSQL]
  H3: Mail.tm as infrastructure
    [Por qué se eligió Mail.tm, qué garantías ofrece]
  H3: No logs, no tracking
    [Verificable: qué exactamente no se almacena y por qué]

H2: Comparing TmpMail to Alternatives
  [Tabla o párrafos comparando con Guerrilla Mail, 10 Minute Mail, Mailinator]
  [Destacar diferenciadores concretos]

H2: Our Privacy Commitments
  [GDPR, datos del responsable del tratamiento, políticas específicas]

H2: Contact and Support
  [email visible, tiempo de respuesta]
```

---

## 13. Checklist de implementación

Ordenado por prioridad. Marcar con `[x]` al completar cada ítem.

### Crítico (implementar en el próximo deploy)

```
[ ] 1.1  Habilitar Cloudflare edge caching para HTML (s-maxage=3600)
[ ] 1.2  Corregir sitemap_index.xml — devolver 404 en lugar de 500
[ ] 2.1  Cambiar redirect raíz / → /en de 302 a 301
[ ] 3.1  Resolver conflicto robots.txt Cloudflare vs site-operator (GPTBot, ClaudeBot, Google-Extended)
[ ] 4.1  Eliminar bloque HowTo JSON-LD (deprecado sept 2023)
[ ] 5.1  Corregir meta description duplicada en Contact page
[ ] 5.1  Corregir meta description duplicada en Privacy page
[ ] 6.1  Expandir las 5 landing pages a 600-800 palabras con contenido único por página
```

### Alto (siguiente sprint / 1-2 semanas)

```
[ ] 2.2  Configurar redirect www → apex 301 en Cloudflare
[ ] 4.2  Evaluar FAQPage JSON-LD — mantener para Bing, documentar que Google lo ignora
[ ] 4.3  Mejorar WebApplication schema: screenshot, featureList, dateModified
[ ] 4.4  Añadir sameAs y description a Organization schema
[ ] 7.1  Activar CSP en modo enforced (revisar violations log primero)
[ ] 8.1  Eliminar opacity:0 + animation-delay del H1 (heroFadeIn)
[ ] 8.2  Añadir preconnect para AdSense, eliminar self-preconnect
[ ] 8.3  Lazy-load AdSense con requestIdleCallback
[ ] 9.1  Actualizar sitemap.ts con lastmod reales y landing pages incluidas
[ ] 10.1 Añadir identidad legal/organizacional verificable a página About
```

### Medio (en el mes siguiente)

```
[ ] 4.5  Añadir SearchAction a WebSite schema (solo si existe búsqueda funcional)
[ ] 4.6  Implementar BreadcrumbList de 2+ niveles en páginas internas
[ ] 5.2  Mejorar títulos de páginas utilitarias (About, Contact, Privacy, Terms)
[ ] 6.2  Añadir H3 subheadings en todas las secciones de más de 100 palabras
[ ] 8.4  Verificar y corregir altura del skeleton vs widget hidratado
[ ] 10.2 Mostrar email de contacto visible en la página Contact
[ ] 11.1 Aumentar tap targets: ES toggle y theme button a min 48×48px
[ ] 11.2 Aumentar texto de botones y FAQ answers de text-xs a text-sm
[ ] 11.3 Corregir PWA manifest: start_url y lang
[ ] 12.1 Expandir prosa de homepage a 500+ palabras
[ ] 12.2 Mejorar página About con historia de origen
```

### Bajo (backlog)

```
[ ] 5.3  Diversificar keywords meta tag por página
[ ] 10.3 Crear presencia en GitHub y ProductHunt; añadir URLs a sameAs
[ ] 11.4 Añadir skip-to-content link
[ ] L    Añadir twitter:site meta tag con el @handle real
[ ] L    Recortar meta description de homepage a ≤150 chars (actualmente 154)
[ ] L    Añadir foundingDate a Organization schema
[ ] L    Ejecutar @next/bundle-analyzer — auditar chunks grandes (52.5KB vendor)
```

---

## 14. Métricas de seguimiento

Verificar estas métricas antes y después de implementar los cambios críticos.

### Core Web Vitals (via PageSpeed Insights o CrUX)

| Métrica | Actual (estimado) | Objetivo post-fix |
|---------|------------------|-------------------|
| LCP | ~2.0–2.4s | <1.8s |
| CLS | ~0.05–0.15 | <0.05 |
| INP | ~100–250ms | <150ms |
| TTFB | ~350–540ms | <100ms |

```bash
# Comandos para monitoreo básico desde CLI:
curl -w "@curl-format.txt" -o /dev/null -s https://tmpmailio.com/en
# curl-format.txt: time_starttransfer=%{time_starttransfer}\ntime_total=%{time_total}\n

# Verificar cf-cache-status después de habilitar edge caching:
for i in 1 2 3; do curl -sI https://tmpmailio.com/en | grep cf-cache-status; done
# Primera petición: MISS, siguientes: HIT
```

### Search Console — métricas a monitorear

- **Coverage:** Reducción de errores 500 (sitemap_index.xml)
- **Mobile Usability:** Reducción de errores de tap targets y font size
- **Core Web Vitals:** Cambio en LCP field data (tarda 28 días en reflejarse)
- **Rich Results:** Aparición de WebApplication rich results tras añadir screenshot

### Puntuación objetivo tras implementación completa

| Categoría | Actual | Objetivo |
|-----------|--------|---------|
| Technical SEO | 71 | 88 |
| Content Quality | 61 | 75 |
| On-Page SEO | 55 | 74 |
| Schema | 65 | 82 |
| Performance | 55 | 80 |
| Images | 90 | 90 |
| AI Search Readiness | 45 | 70 |
| **Health Score** | **63** | **~80** |
