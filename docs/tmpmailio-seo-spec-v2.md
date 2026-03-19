# TmpMail SEO — Spec de Implementación v2
**Sitio:** https://tmpmailio.com/es
**Auditoría:** 2026-03-19 (6 agentes en paralelo)
**Stack confirmado:** Next.js App Router · Cloudflare CDN · Tailwind CSS · next-intl · WebSocket nativo
**Puntuación actual:** 68/100 → **Objetivo:** 82+/100

> **Nota de contexto:** Este spec reemplaza y complementa la v1 (2026-03-18).
> Las mejoras de infraestructura de la v1 ya están desplegadas: Cloudflare activo (cf-ray confirmado),
> HTTP/2 + HTTP/3 activos, HSTS con preload, sin Framer Motion, sin Socket.IO.
> Este documento cubre exclusivamente los issues encontrados en la auditoría del 2026-03-19.

---

## Índice

1. [Seguridad](#1-seguridad)
2. [robots.txt](#2-robotstxt)
3. [Redirects y estructura de URLs](#3-redirects-y-estructura-de-urls)
4. [Hreflang e internacionalización](#4-hreflang-e-internacionalización)
5. [Sitemap XML](#5-sitemap-xml)
6. [Schema / Datos Estructurados](#6-schema--datos-estructurados)
7. [Metadata y On-Page SEO](#7-metadata-y-on-page-seo)
8. [Contenido y E-E-A-T](#8-contenido-y-e-e-a-t)
9. [Rendimiento y Core Web Vitals](#9-rendimiento-y-core-web-vitals)
10. [Accesibilidad y Mobile](#10-accesibilidad-y-mobile)
11. [Visual y UX](#11-visual-y-ux)
12. [Checklist de implementación](#12-checklist-de-implementación)
13. [Métricas de seguimiento](#13-métricas-de-seguimiento)

---

## 1. Seguridad

### 1.1 — Activar Content-Security-Policy en modo enforced

**Prioridad:** ALTA
**Archivo:** `next.config.js` o `middleware.ts`
**Contexto:** La CSP existe pero está en `content-security-policy-report-only`. No bloquea nada. El endpoint de reportes ya está recibiendo datos — revisar el log antes de activar.

**Pasos:**

1. Auditar el log de violaciones del endpoint `/api/csp-report`. Corregir todas las fuentes legítimas bloqueadas.
2. Si el código usa `'unsafe-inline'` para scripts, implementar CSP nonces. Next.js App Router soporta nonces nativamente:

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'unsafe-inline'`,          // Tailwind requiere inline styles
    `font-src 'self'`,
    `img-src 'self' data: blob:`,
    `connect-src 'self' wss://api.tmpmailio.com https://api.tmpmailio.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Cambiar de report-only a enforced:
  response.headers.set('content-security-policy', cspHeader)
  response.headers.delete('content-security-policy-report-only')

  return response
}
```

```tsx
// app/layout.tsx — pasar el nonce a los scripts inline
import { headers } from 'next/headers'

export default function RootLayout({ children }) {
  const nonce = headers().get('x-nonce') ?? ''
  return (
    <html>
      <head>
        {/* El script de detección de tema necesita el nonce */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeDetectionScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Verificación:**
```bash
curl -I https://tmpmailio.com/es | grep -i "content-security-policy"
# No debe aparecer "report-only" en la cabecera activa
```

---

## 2. robots.txt

### 2.1 — Resolver conflicto de directivas para GPTBot y ClaudeBot

**Prioridad:** ALTA
**Archivo:** `public/robots.txt`
**Contexto:** El bloque gestionado por Cloudflare genera `Disallow: /` para GPTBot y ClaudeBot. El bloque del operador del sitio inmediatamente los re-autoriza con `Allow: /`. El comportamiento ante directivas duplicadas en conflicto varía por parser.

**Problema actual:**
```txt
# === Cloudflare Managed Block (auto-generado) ===
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

# === Site operator block ===
User-Agent: GPTBot
Allow: /

User-Agent: ClaudeBot
Allow: /
```

**Solución A — Configurar Cloudflare para no inyectar esas reglas (recomendada):**
1. En el panel de Cloudflare → Security → Bots → "Bot Fight Mode" o "AI Bot Protection".
2. Desactivar el bloqueo específico para GPTBot y ClaudeBot desde la UI de Cloudflare.
3. Cloudflare dejará de inyectar esas reglas en el robots.txt gestionado.

**Solución B — Usar robots.txt estático en `public/` para anular el gestionado:**

Si no hay acceso a la configuración de Cloudflare Managed Robots.txt, asegurarse de que el archivo `public/robots.txt` de Next.js sea el que se sirve y que contenga directivas sin conflicto:

```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /internal/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Amazonbot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

Sitemap: https://tmpmailio.com/sitemap.xml
```

**Verificación:**
```bash
curl https://tmpmailio.com/robots.txt | grep -A2 "GPTBot"
# Solo debe aparecer un bloque por bot, sin contradicciones
```

---

## 3. Redirects y estructura de URLs

### 3.1 — Cambiar redirección raíz de 302 a 301

**Prioridad:** ALTA
**Archivo:** `middleware.ts`
**Contexto:** `https://tmpmailio.com/` → `https://tmpmailio.com/en` devuelve HTTP 302 (temporal). Una redirección temporal no consolida PageRank desde la raíz.

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    // ANTES: NextResponse.redirect(new URL('/en', request.url))
    // DESPUÉS:
    return NextResponse.redirect(new URL('/en', request.url), 301)
  }

  // ... resto del middleware
}
```

**Verificación:**
```bash
curl -I https://tmpmailio.com/ | grep -i "location\|301\|302"
# Debe mostrar: HTTP/2 301
```

---

## 4. Hreflang e internacionalización

### 4.1 — Estandarizar x-default en las tres fuentes

**Prioridad:** ALTA
**Contexto:** La cabecera HTTP `Link` apunta `x-default` a `https://tmpmailio.com/` (la raíz con 302), mientras que el HTML `<link>` apunta a `https://tmpmailio.com/en`. El sitemap usa `/en`. Deben ser consistentes.

**Archivo:** `middleware.ts` o `next.config.js` (donde se generen las cabeceras HTTP `Link`)

```ts
// Buscar dónde se generan las cabeceras HTTP Link con hreflang
// En Next.js App Router, esto suele estar en el response headers del middleware:

response.headers.set(
  'Link',
  [
    `<https://tmpmailio.com/es>; rel="alternate"; hreflang="es"`,
    `<https://tmpmailio.com/en>; rel="alternate"; hreflang="en"`,
    `<https://tmpmailio.com/en>; rel="alternate"; hreflang="x-default"`,
    // ANTES apuntaba a https://tmpmailio.com/ (la raíz con 302)
    // DESPUÉS apunta a /en en las tres fuentes
  ].join(', ')
)
```

**HTML — confirmar que el layout ya tiene:**
```tsx
// app/[locale]/layout.tsx
// Verificar que generateMetadata o el <head> contiene:
<link rel="alternate" hreflang="es" href="https://tmpmailio.com/es" />
<link rel="alternate" hreflang="en" href="https://tmpmailio.com/en" />
<link rel="alternate" hreflang="x-default" href="https://tmpmailio.com/en" />
// TODAS deben apuntar a /en para x-default, NO a la raíz
```

**Verificación:**
```bash
curl -I https://tmpmailio.com/es | grep -i "link:"
curl -s https://tmpmailio.com/es | grep -i "hreflang"
# Ambas fuentes deben declarar x-default apuntando a /en
```

---

## 5. Sitemap XML

### 5.1 — Añadir /about y /contact al sitemap

**Prioridad:** ALTA
**Archivo:** `app/sitemap.ts`

```ts
// app/sitemap.ts
import { MetadataRoute } from 'next'

const BASE_URL = 'https://tmpmailio.com'
const LOCALES = ['es', 'en'] as const

// Usar fechas reales de modificación de contenido, no new Date()
const PAGE_DATES: Record<string, string> = {
  home:    '2026-01-15',
  privacy: '2026-02-10',
  terms:   '2026-02-10',
  contact: '2026-01-20',
  about:   '2026-01-20',
}

function buildHreflang(slug: string) {
  const base = slug === 'home' ? '' : `/${slug}`
  return {
    'x-default': `${BASE_URL}/en${base}`,
    es:          `${BASE_URL}/es${base}`,
    en:          `${BASE_URL}/en${base}`,
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { slug: 'home',    path: '' },
    { slug: 'privacy', path: '/privacy' },
    { slug: 'terms',   path: '/terms' },
    { slug: 'contact', path: '/contact' },
    { slug: 'about',   path: '/about' },
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const page of pages) {
    for (const locale of LOCALES) {
      entries.push({
        url:          `${BASE_URL}/${locale}${page.path}`,
        lastModified: PAGE_DATES[page.slug],
        alternates:   { languages: buildHreflang(page.slug) },
      })
    }
  }

  return entries
}
```

**Importante — lastModified:**
No usar `new Date()` ni `new Date().toISOString()`. Usar la fecha real de última modificación de contenido en formato `YYYY-MM-DD`. Actualizar `PAGE_DATES` manualmente cuando cambie el contenido de cada página.

**Verificación:**
```bash
curl https://tmpmailio.com/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sort
# Debe listar 10 URLs (5 páginas × 2 locales)
# Verificar que los lastmod son fechas fijas, no el timestamp actual
```

---

## 6. Schema / Datos Estructurados

### 6.1 — Añadir FAQPage JSON-LD

**Prioridad:** CRÍTICA
**Archivo:** `app/[locale]/page.tsx`
**Contexto:** Los rich results de FAQPage están restringidos a sitios gubernamentales y de salud desde agosto 2023, por lo que no generarán paneles expandibles en SERPs. Sin embargo, el schema FAQPage **sigue siendo la señal estructurada más directa para AI Overviews, ChatGPT y Perplexity** para extraer respuestas citable de la página. Los 6 pares Q&A existen en el HTML pero sin markup semántico.

```ts
// lib/schema/faq.ts
export function buildFaqSchema(locale: 'es' | 'en') {
  const faqs = {
    es: [
      {
        q: '¿Qué es un correo temporal?',
        a: 'Un correo temporal o desechable es una dirección de email que se genera automáticamente, funciona durante un tiempo limitado y se elimina sola. No requiere registro ni contraseña. TmpMail genera una dirección en segundos que expira tras 10 minutos de inactividad.',
      },
      {
        q: '¿Cuánto tiempo dura mi correo temporal?',
        a: 'Tu dirección temporal dura 10 minutos por defecto. Cada vez que recibes un nuevo correo, el temporizador se reinicia añadiendo 5 minutos adicionales. Esto significa que mientras estés usando activamente el buzón, la dirección permanece activa.',
      },
      {
        q: '¿Son seguros los correos temporales?',
        a: 'TmpMail no almacena tus datos ni tu dirección IP. Todos los mensajes se eliminan automáticamente al expirar. Sin embargo, cualquier persona que conozca tu dirección temporal puede ver tus correos, por lo que no debes usarla para información sensible o confidencial.',
      },
      {
        q: '¿Puedo recibir archivos adjuntos?',
        a: 'Sí, puedes recibir archivos adjuntos de hasta 5 MB. Los adjuntos están disponibles para descarga mientras el buzón esté activo.',
      },
      {
        q: '¿Puedo enviar correos con TmpMail?',
        a: 'No. TmpMail es un servicio de recepción únicamente. La dirección temporal está diseñada para recibir correos de verificación y evitar el spam, no para enviar mensajes.',
      },
      {
        q: '¿Para qué se usa un correo desechable?',
        a: 'Los correos temporales son ideales para registrarte en servicios que no conoces, verificar cuentas sin exponer tu email real, probar aplicaciones durante el desarrollo, o evitar newsletters y spam en tu bandeja de entrada principal.',
      },
    ],
    en: [
      // ... versión en inglés (añadir traducciones correspondientes)
    ],
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs[locale].map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}
```

```tsx
// app/[locale]/page.tsx
import { buildFaqSchema } from '@/lib/schema/faq'

export default async function HomePage({ params }: { params: { locale: string } }) {
  const faqSchema = buildFaqSchema(params.locale as 'es' | 'en')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ... resto de la página */}
    </>
  )
}
```

**Verificación:**
```bash
curl -s https://tmpmailio.com/es | python3 -c "
import sys, json, re
html = sys.stdin.read()
schemas = re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', html, re.DOTALL)
for s in schemas:
    d = json.loads(s)
    print(d.get('@type'))
"
# Debe mostrar: FAQPage (entre los otros tipos)
```

---

### 6.2 — Añadir HowTo JSON-LD para la sección "Cómo funciona"

**Prioridad:** MEDIA
**Archivo:** `app/[locale]/page.tsx`

```ts
// lib/schema/howto.ts
export function buildHowToSchema(locale: 'es' | 'en') {
  const content = {
    es: {
      name: 'Cómo usar TmpMail — Correo Temporal en 4 pasos',
      description: 'Guía paso a paso para crear y usar una dirección de correo temporal desechable con TmpMail.',
      steps: [
        {
          name: 'Abre TmpMail',
          text: 'Visita tmpmailio.com/es. Tu dirección de correo temporal se genera automáticamente al cargar la página. No necesitas registro, contraseña ni datos personales.',
        },
        {
          name: 'Copia tu dirección temporal',
          text: 'Haz clic en el botón "Copiar" junto a tu dirección de email. La dirección se copiará al portapapeles lista para pegar en cualquier formulario.',
        },
        {
          name: 'Úsala donde la necesites',
          text: 'Pega la dirección en el campo de email del servicio donde quieres registrarte o verificar tu cuenta.',
        },
        {
          name: 'Recibe tus correos al instante',
          text: 'Los mensajes entrantes aparecen en tiempo real en tu bandeja de TmpMail. Puedes leer el contenido completo y descargar adjuntos de hasta 5 MB.',
        },
        {
          name: 'El correo expira automáticamente',
          text: 'Tras 10 minutos sin actividad, la dirección y todos sus mensajes se eliminan de forma permanente. No necesitas hacer nada para limpiar tu rastro.',
        },
      ],
    },
    en: {
      // ... versión en inglés
    },
  }

  const c = content[locale]
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: c.name,
    description: c.description,
    step: c.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  }
}
```

---

### 6.3 — Corregir propiedades del schema WebApplication

**Prioridad:** MEDIA
**Archivo:** Donde esté definido el bloque WebApplication (probablemente `app/[locale]/page.tsx` o `lib/schema/webapp.ts`)

**Cambios requeridos:**

```ts
// ANTES (valores incorrectos)
{
  "@type": "WebApplication",
  "applicationCategory": "UtilitiesApplication",  // ❌ no reconocido por Google
  "operatingSystem": "All",                         // ❌ no reconocido
  "featureList": ["feature 1", "feature 2"],        // ❌ debe ser Text, no array
}

// DESPUÉS (valores correctos)
{
  "@type": "WebApplication",
  "@id": `https://tmpmailio.com/${locale}/#webapp`,
  "name": "TmpMail",
  "url": `https://tmpmailio.com/${locale}`,
  "applicationCategory": "Utilities",              // ✓ valor correcto según spec de Google
  "operatingSystem": "Any web browser",             // ✓ valor reconocido
  "isAccessibleForFree": true,
  "inLanguage": locale === 'es' ? "es" : "en",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "featureList": "Correo temporal gratis, Sin registro requerido, Inbox en tiempo real, Expiración automática en 10 minutos, Soporte de adjuntos hasta 5MB, Generación de código QR",
  // ✓ featureList es una cadena de texto, no un array
  "publisher": {
    "@type": "Organization",
    "@id": "https://tmpmailio.com/#organization"
  }
}
```

---

### 6.4 — Añadir BreadcrumbList de 2 elementos en páginas internas

**Prioridad:** ALTA
**Archivo:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx`

```ts
// lib/schema/breadcrumb.ts
export function buildBreadcrumb(locale: string, pageName: string, pageSlug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'TmpMail',
        item: `https://tmpmailio.com/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageName,
        item: `https://tmpmailio.com/${locale}/${pageSlug}`,
      },
    ],
  }
}
```

```tsx
// app/[locale]/privacy/page.tsx
import { buildBreadcrumb } from '@/lib/schema/breadcrumb'

export default async function PrivacyPage({ params }) {
  const { locale } = params
  const pageNames = { es: 'Política de Privacidad', en: 'Privacy Policy' }
  const breadcrumb = buildBreadcrumb(locale, pageNames[locale], 'privacy')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* ... contenido */}
    </>
  )
}
```

Aplicar el mismo patrón a `terms`, `about`, y `contact` con sus nombres de página correspondientes.

---

### 6.5 — Añadir sameAs a la Organización cuando existan perfiles externos

**Prioridad:** ALTA (implementar cuando haya perfiles)
**Archivo:** Donde esté definido el schema `Organization`

```ts
// CUANDO SE CREEN PERFILES EXTERNOS, añadir al Organization schema:
{
  "@type": "Organization",
  "@id": "https://tmpmailio.com/#organization",
  "name": "TmpMail",
  // ... propiedades existentes
  "sameAs": [
    "https://github.com/[username]/tmpmailio",        // si existe repo público
    "https://www.producthunt.com/products/tmpmail",   // si está en Product Hunt
    "https://twitter.com/tmpmailio",                  // si existe cuenta
  ]
  // Solo añadir URLs reales y verificables. No añadir URLs inexistentes.
}
```

---

## 7. Metadata y On-Page SEO

### 7.1 — Corregir og:url en páginas internas (bug de herencia de metadata)

**Prioridad:** ALTA
**Contexto:** About, Privacy, Terms y Contact emiten `og:url: https://tmpmailio.com/es` (la URL de la homepage) en lugar de su propia URL canónica. Es un bug de herencia en Next.js donde el layout raíz no es sobreescrito.

**Archivo:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/about/page.tsx`, `app/[locale]/contact/page.tsx`

```tsx
// Patrón para CADA sub-página. Ejemplo: privacy
// app/[locale]/privacy/page.tsx

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const { locale } = params
  const canonicalUrl = `https://tmpmailio.com/${locale}/privacy`

  return {
    title: locale === 'es' ? 'Política de Privacidad — TmpMail' : 'Privacy Policy — TmpMail',
    description:
      locale === 'es'
        ? 'Cómo TmpMail gestiona y protege tu privacidad. Sin datos personales almacenados.'
        : 'How TmpMail handles and protects your privacy. No personal data stored.',
    alternates: {
      canonical: canonicalUrl,
      languages: {
        es: 'https://tmpmailio.com/es/privacy',
        en: 'https://tmpmailio.com/en/privacy',
        'x-default': 'https://tmpmailio.com/en/privacy',
      },
    },
    openGraph: {
      url: canonicalUrl,           // ← ESTA ES LA CORRECCIÓN CLAVE
      title: locale === 'es' ? 'Política de Privacidad — TmpMail' : 'Privacy Policy — TmpMail',
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      alternateLocale: locale === 'es' ? ['en_US'] : ['es_ES'],
    },
  }
}
```

Repetir el mismo patrón para `terms`, `about` y `contact`, cambiando el slug, título y descripción.

---

### 7.2 — Eliminar "correo fake" de meta keywords

**Prioridad:** MEDIA
**Archivo:** Donde esté definida la etiqueta `<meta name="keywords">` para la página `/es`

```tsx
// ANTES
keywords: 'correo temporal, email desechable, correo desechable, email temporal gratis, inbox temporal, correo fake'

// DESPUÉS
keywords: 'correo temporal, email desechable, correo desechable, email temporal gratis, inbox temporal, correo temporal seguro, proteger privacidad email'
```

---

### 7.3 — Corregir og:image:alt en la versión /es

**Prioridad:** BAJA
**Archivo:** `app/[locale]/page.tsx` o layout

```tsx
// ANTES — mezcla inglés y español
openGraph: {
  images: [{
    url: '...',
    alt: 'TmpMail — Free Temporary Email / Correo Temporal Gratis',
  }]
}

// DESPUÉS — solo español para la versión /es
openGraph: {
  images: [{
    url: '...',
    alt: locale === 'es'
      ? 'TmpMail — Correo Temporal Gratis y Desechable'
      : 'TmpMail — Free Disposable Temporary Email',
  }]
}
```

---

### 7.4 — Añadir elemento `<time>` a la fecha de actualización del footer

**Prioridad:** BAJA
**Archivo:** Componente del footer

```tsx
// ANTES
<span>Actualizado: marzo 2026</span>

// DESPUÉS
<time dateTime="2026-03">Actualizado: marzo 2026</time>
```

Actualizar el atributo `dateTime` cada vez que se modifique el contenido principal del sitio.

---

## 8. Contenido y E-E-A-T

### 8.1 — Renderizar el trust badge en el HTML del servidor

**Prioridad:** ALTA
**Contexto:** La cadena `"hero.trustBadge": "Más de 5 millones de correos generados"` existe en el payload i18n pero nunca se renderiza como HTML. Google y los sistemas de IA no la ven.

**Archivo:** Componente del hero (probablemente `components/HeroSection.tsx` o equivalente)

```tsx
// Localizar en el componente hero dónde se consume hero.trustBadge
// y asegurarse de que se renderiza como HTML visible:

// ANTES — probablemente condicionado a algo que falla:
{trustBadge && <p className="trust-badge">{trustBadge}</p>}

// DESPUÉS — renderizar incondicionalmente desde next-intl:
import { useTranslations } from 'next-intl'

export function HeroSection() {
  const t = useTranslations('hero')

  return (
    <section>
      {/* ... widget del correo */}
      <p className="text-sm text-muted-foreground text-center mt-3">
        {t('trustBadge')}
        {/* Renderiza: "Más de 5 millones de correos generados" */}
      </p>
    </section>
  )
}
```

Si el número de 5 millones es verificable, añadirlo también al schema WebApplication:
```ts
"description": "... Más de 5 millones de correos temporales generados."
```

---

### 8.2 — Ampliar Política de Privacidad (RGPD / LOPDGDD)

**Prioridad:** CRÍTICA
**Archivo:** `app/[locale]/privacy/page.tsx` — el contenido de la página
**Actual:** ~180 palabras, sin marco legal
**Objetivo:** mínimo 450 palabras con las siguientes secciones

**Estructura requerida para `/es/privacy`:**

```md
## Política de Privacidad — TmpMail

Última actualización: [fecha]

### Responsable del tratamiento
[Nombre o descripción de la entidad], con dominio tmpmailio.com.
Contacto: contacto@tmpmailio.com

### Marco legal aplicable
De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica
3/2018 de Protección de Datos Personales y Garantía de los Derechos Digitales
(LOPDGDD), te informamos del siguiente tratamiento de datos.

### Datos que NO recopilamos
TmpMail está diseñado para no recopilar datos personales:
- No solicitamos nombre, dirección física ni información de pago
- No almacenamos tu dirección IP de forma permanente
- No usamos cookies de seguimiento ni tecnologías de rastreo
- No compartimos datos con terceros para fines publicitarios

### Datos que SÍ procesamos temporalmente
- **Dirección de correo temporal generada:** Se almacena en memoria (Redis)
  durante el período activo de la sesión (máximo 10 minutos de inactividad).
  Se elimina automáticamente al expirar.
- **Contenido de los correos recibidos:** Los mensajes entrantes se procesan
  a través de la API de Mail.tm. Consulta la [política de privacidad de Mail.tm]
  para más información sobre su tratamiento.

### Cookies
Utilizamos una única cookie de sesión técnica para asociar tu bandeja de entrada
temporal con tu navegador. Esta cookie no contiene datos personales identificables,
no se comparte con terceros y se elimina al cerrar el navegador.

### Tus derechos
Tienes derecho a acceder, rectificar, suprimir y portar tus datos, así como a
oponerte a su tratamiento. Dado que no almacenamos datos personales de forma
permanente, puedes ejercer estos derechos en cualquier momento contactando
a contacto@tmpmailio.com.

### Transferencias internacionales
El servicio opera a través de infraestructura de Cloudflare (ubicada en múltiples
jurisdicciones) y Mail.tm. Ambos proveedores cuentan con salvaguardas adecuadas
conforme al RGPD.

### Modificaciones
Podemos actualizar esta política. La fecha de última modificación se muestra
al inicio del documento.
```

---

### 8.3 — Ampliar páginas About, Terms y Contact

**Prioridad:** ALTA
**Archivo:** `app/[locale]/about/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/contact/page.tsx`

#### About — estructura mínima (~350 palabras):
```md
## Sobre TmpMail

TmpMail es un servicio gratuito de correo electrónico temporal desarrollado
por un equipo independiente comprometido con la privacidad digital.

### ¿Por qué creamos TmpMail?
[Párrafo sobre la motivación: spam, privacidad, necesidad de herramientas simples]

### Cómo funciona técnicamente
TmpMail usa almacenamiento en memoria (Redis) para guardar temporalmente
los correos. Los mensajes se enrutan a través de la API de Mail.tm.
Toda la infraestructura está servida sobre Cloudflare para garantizar
disponibilidad y velocidad global.

### Nuestro compromiso con la privacidad
- Sin registro, sin cookies de seguimiento, sin publicidad
- Los correos se eliminan automáticamente — no hay copias de seguridad
- No almacenamos IPs ni datos de navegación

### Contacto y soporte
Para reportar abusos, problemas técnicos o preguntas: contacto@tmpmailio.com
Tiempo de respuesta habitual: 24-48 horas.

### Política de uso aceptable
TmpMail está diseñado para usos legítimos de privacidad. Se prohíbe su uso
para actividades ilegales, fraude, spam o cualquier actividad que viole
los términos de Mail.tm.
```

#### Terms — estructura mínima (~350 palabras):
```md
## Términos de Servicio

### 1. Aceptación de los términos
Al usar TmpMail, aceptas estos términos. Si no estás de acuerdo, no uses el servicio.

### 2. Descripción del servicio
TmpMail proporciona direcciones de correo temporal desechable gratuitas. El servicio
se ofrece "tal como está" sin garantías de disponibilidad continua.

### 3. Uso aceptable
Está prohibido usar TmpMail para:
- Actividades ilegales o fraudulentas
- Enviar spam o contenido malicioso (el servicio es solo de recepción)
- Eludir verificaciones de seguridad de plataformas de forma fraudulenta
- Cualquier actividad que viole las leyes aplicables

### 4. Limitación de responsabilidad
TmpMail no es responsable de la pérdida de correos al expirar la dirección.
Los mensajes no se almacenan de forma permanente. No usar para comunicaciones críticas.

### 5. Propiedad intelectual
El servicio, su diseño y código son propiedad del operador. El contenido de los
correos recibidos pertenece a sus respectivos remitentes.

### 6. Modificaciones del servicio
Nos reservamos el derecho de modificar o discontinuar el servicio en cualquier momento.

### 7. Ley aplicable y jurisdicción
Estos términos se rigen por la legislación española. Para cualquier disputa,
las partes se someten a la jurisdicción de los tribunales españoles.

### 8. Contacto
Para consultas sobre estos términos: contacto@tmpmailio.com
```

---

### 8.4 — Añadir enlace a la política de privacidad de Mail.tm

**Prioridad:** MEDIA
**Archivo:** `app/[locale]/privacy/page.tsx`

En la sección donde se menciona Mail.tm:
```tsx
// ANTES
<p>Los correos se procesan a través de la API de Mail.tm.</p>

// DESPUÉS — con enlace externo explícito
<p>
  Los correos se procesan a través de la API de{' '}
  <a href="https://mail.tm/en/privacy-policy/" target="_blank" rel="noopener noreferrer">
    Mail.tm
  </a>
  {'. '}
  Consulta su{' '}
  <a href="https://mail.tm/en/privacy-policy/" target="_blank" rel="noopener noreferrer">
    política de privacidad
  </a>
  {' '}para más información sobre su tratamiento de datos.
</p>
```

---

### 8.5 — Estandarizar nombre de marca en todo el sitio

**Prioridad:** BAJA
**Contexto:** El contenido usa "TmpMail" pero el dominio es `tmpmailio.com`, el schema Organization usa `alternateName: "TmpMailio"`, y el copyright usa "TmpMailio". El nombre canónico debe ser uno solo.

**Decisión recomendada:** Usar **"TmpMail"** como nombre principal (es el que aparece en el H1, title tag y cuerpo del texto).

**Archivos a revisar y corregir:**
- Footer: cambiar "TmpMailio" → "TmpMail"
- Copyright: cambiar "© 2026 TmpMailio" → "© 2026 TmpMail"
- Schema Organization: cambiar `"alternateName": "TmpMailio"` → `"alternateName": "Tmpmailio"` (el dominio, como alternativa técnica, en minúsculas)
- Cualquier referencia en textos legales

---

## 9. Rendimiento y Core Web Vitals

### 9.1 — Habilitar caché del HTML en el edge de Cloudflare

**Prioridad:** MEDIA
**Contexto:** `cf-cache-status: BYPASS` confirma que el HTML no se cachea en Cloudflare. Cada visita llega al servidor de origen (TTFB: 345ms). El shell HTML pre-hidratación es idéntico para todos los visitantes de `/es` — la dirección de correo única se genera en el cliente con JavaScript.

**Archivo:** `next.config.js`

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        // Cachear el shell HTML de las páginas de locale en el edge
        source: '/:locale(es|en)',
        headers: [
          {
            key: 'Cache-Control',
            // s-maxage controla la caché del CDN (Cloudflare)
            // max-age controla la caché del navegador (corto — el correo cambia)
            // stale-while-revalidate: servir desde caché mientras regenera en background
            value: 'public, s-maxage=120, stale-while-revalidate=600, max-age=10',
          },
        ],
      },
    ]
  },
}
```

**Alternativa con Cloudflare Cache Rules (si no se puede controlar desde Next.js):**
1. En Cloudflare → Rules → Cache Rules → Create Rule
2. Condición: `URI Path matches regex ^/(es|en)$`
3. Cache Status: `Eligible for cache`
4. Edge TTL: `2 minutes`
5. Browser TTL: `10 seconds`

**Verificación:**
```bash
curl -I https://tmpmailio.com/es | grep -i "cf-cache-status\|cache-control"
# Después del primer request: cf-cache-status: MISS
# Requests subsiguientes: cf-cache-status: HIT
```

---

### 9.2 — Reemplazar preconnect redundante y añadir el correcto

**Prioridad:** MEDIA
**Archivo:** `app/layout.tsx` o `app/[locale]/layout.tsx`

```tsx
// ANTES — preconnect al mismo origen (no-op)
<link rel="preconnect" href="https://tmpmailio.com" />
<link rel="dns-prefetch" href="https://tmpmailio.com" />

// DESPUÉS — preconnect al origen de la API (útil para la conexión WebSocket)
// El preconnect al mismo origen se elimina.
// Se añade preconnect a la API que es el primer recurso externo tras hidratación:
<link rel="preconnect" href="https://api.tmpmailio.com" />
<link rel="dns-prefetch" href="https://api.tmpmailio.com" />
```

Si se usan Google Fonts (aparecen en la CSP):
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
```

---

### 9.3 — Verificar altura del skeleton del email widget para prevenir CLS

**Prioridad:** MEDIA
**Contexto:** El skeleton usa `h-[60px]`. Si el widget hidratado tiene una altura diferente, se produce un layout shift (CLS). Verificar la coincidencia exacta.

**Procedimiento de verificación:**
1. Abrir `https://tmpmailio.com/es` en Chrome DevTools
2. En la pestaña Performance, activar "Web Vitals" y grabar la carga
3. Inspeccionar el Layout Shift attributor para el widget del correo
4. Si hay shift, medir la altura del componente hidratado con el inspector de elementos

**Corrección si la altura no coincide:**
```tsx
// En el componente del email widget, el skeleton debe tener exactamente
// la misma estructura de padding y altura que el estado cargado:

// Componente cargado (medir su altura real):
<div className="flex items-center gap-2 p-3 border rounded-lg h-[60px]">
  <span className="font-mono text-sm">{emailAddress}</span>
  <button>Copiar</button>
</div>

// Skeleton debe replicar exactamente:
<div className="h-[60px] animate-pulse bg-[var(--bg-secondary)] border rounded-lg" />
// ✓ misma altura, mismo border-radius, mismo border
```

---

### 9.4 — Reducir delay de la animación del H1 hero

**Prioridad:** BAJA
**Contexto:** La animación `heroFadeIn` comienza desde `opacity: 0` con un delay de `0.1s`. El algoritmo de LCP registra el tiempo de visibilidad, no el tiempo de inserción en el DOM. Este delay de 100ms penaliza el LCP innecesariamente.

**Archivo:** `globals.css` o el archivo CSS donde esté definida la animación `heroFadeIn`

```css
/* ANTES */
.hero-h1 {
  animation: heroFadeIn 0.4s ease 0.1s both;
}

/* DESPUÉS — eliminar el delay */
.hero-h1 {
  animation: heroFadeIn 0.3s ease both;
  /* Sin delay: el elemento es visible desde el primer frame */
}
```

---

## 10. Accesibilidad y Mobile

### 10.1 — Corregir contraste del color de acento en modo claro

**Prioridad:** CRÍTICA
**Contexto:** El color lima (acento principal) sobre fondo blanco en modo claro produce un ratio de contraste de 1.22:1. El mínimo WCAG AA para texto normal es 4.5:1, para texto grande 3:1.

**Archivo:** `globals.css` o el archivo de variables CSS (buscar `.light`, `[data-theme="light"]` o `html.light`)

```css
/* Localizar las variables del tema claro. Buscar en: globals.css, theme.css, o variables.css */

/* ANTES — en el tema claro, el acento es lima sobre blanco */
:root,
.light {
  --accent: #a3e635;      /* lime-400 — 1.22:1 sobre blanco ❌ */
  --accent-foreground: #a3e635;
}

/* DESPUÉS — reemplazar con un verde oscuro que pase WCAG AA */
:root,
.light {
  --accent: #15803d;         /* green-700 — 5.74:1 sobre blanco ✓ */
  --accent-foreground: #14532d; /* green-900 — 9.1:1 ✓ para texto sobre fondos claros */
  --accent-border: #16a34a;   /* green-600 — para bordes */
}
```

**Paleta alternativa que mantiene la estética "terminal":**
```css
.light {
  --accent: #0d7a3e;          /* teal-green oscuro: 5.2:1 ✓ */
  --accent-glow: #dcfce7;     /* green-100: para fondos tenues de acento */
}
```

**Verificar** con cualquier herramienta de contraste que el ratio sea ≥ 4.5:1 para textos normales y ≥ 3:1 para textos grandes (> 18pt o > 14pt bold).

---

### 10.2 — Corregir line-height del H1 (WCAG SC 1.4.12)

**Prioridad:** ALTA
**Contexto:** El H1 tiene `font-size: 48px` y `line-height: 48px` (ratio 1.0). WCAG 2.1 SC 1.4.12 requiere que los encabezados puedan tener un interlineado de al menos 1.2× sin pérdida de funcionalidad.

**Archivo:** Donde esté definida la clase del H1 hero (buscar `hero-h1` o la clase Tailwind del `<h1>`)

```css
/* ANTES */
.hero-h1 {
  font-size: 48px;
  line-height: 48px;   /* ratio 1.0 ❌ */
}

/* DESPUÉS */
.hero-h1 {
  font-size: 48px;
  line-height: 1.15;   /* ≈ 55px — ratio 1.15 ✓ */
}
```

**En Tailwind:** Si el H1 usa `text-5xl` (48px, line-height 1), añadir la clase `leading-tight` (1.25) o `leading-[1.15]`:
```tsx
// ANTES
<h1 className="text-3xl md:text-5xl font-extrabold font-display">

// DESPUÉS
<h1 className="text-3xl md:text-5xl font-extrabold font-display leading-tight">
//                                                                  ^^^^^^^^^^^
```

---

### 10.3 — Ampliar tap targets del footer y selector de idioma

**Prioridad:** ALTA
**Contexto:** Los enlaces de navegación del footer miden 32px de altura. El toggle de idioma mide 26×32px en el header. El mínimo recomendado por Google para mobile es 48×48px.

**Archivo:** Componente del footer y del header/navigation

```tsx
// Footer links — ANTES
<a href="/es/privacy" className="text-sm text-muted">
  Política de Privacidad
</a>

// DESPUÉS — añadir padding para aumentar el área táctil
<a
  href="/es/privacy"
  className="text-sm text-muted py-3 px-1 inline-flex items-center min-h-[48px]"
>
  Política de Privacidad
</a>
```

```tsx
// Language switcher — ANTES (probablemente un <button> o <a> pequeño)
<button className="text-xs px-2 py-1">EN</button>

// DESPUÉS
<button className="text-xs px-3 min-w-[48px] min-h-[48px] flex items-center justify-center">
  EN
</button>
```

---

### 10.4 — Abrir el primer elemento del FAQ por defecto

**Prioridad:** MEDIA
**Archivo:** Componente del FAQ (buscar el `<details>` o el componente de acordeón)

```tsx
// ANTES — todos los elementos colapsados
{faqs.map((faq, index) => (
  <details key={faq.question}>
    <summary>{faq.question}</summary>
    <p>{faq.answer}</p>
  </details>
))}

// DESPUÉS — primer elemento abierto por defecto
{faqs.map((faq, index) => (
  <details key={faq.question} open={index === 0}>
    <summary>{faq.question}</summary>
    <p>{faq.answer}</p>
  </details>
))}
```

---

## 11. Visual y UX

### 11.1 — Arreglar apple-touch-icon (HTTP 500)

**Prioridad:** MEDIA
**Contexto:** `https://tmpmailio.com/apple-touch-icon.png` devuelve HTTP 500.

**Diagnóstico:**
```bash
curl -I https://tmpmailio.com/apple-touch-icon.png
# Debe devolver 200. Si devuelve 500, el archivo no existe en public/ o hay un error de servidor.
```

**Solución:**
1. Verificar que existe `public/apple-touch-icon.png` en el repositorio.
2. Si no existe, crear un PNG de 180×180px con el logo/icono de TmpMail.
3. Si existe pero da 500, verificar que no haya un middleware o route handler que intercepte esa ruta.

```tsx
// En next.config.js, si hay rewrites que puedan estar interceptando:
async rewrites() {
  return [
    // Asegurarse de que /apple-touch-icon.png no está siendo reescrito
  ]
}
```

**Referencia en el HTML (verificar que esté en el `<head>`):**
```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

---

### 11.2 — Añadir indicador de scroll al panel del inbox en móvil

**Prioridad:** MEDIA
**Contexto:** El panel "CLIENTE DE CORREO" (el inbox) está below the fold en móvil sin ningún indicador visual. Los usuarios nuevos pueden pensar que el correo es solo para copiar la dirección.

**Archivo:** Componente del hero o del layout principal

```tsx
// Añadir después del widget del correo y antes del panel del inbox,
// un indicador sutil de scroll visible solo en móvil:

<div className="flex flex-col items-center gap-1 mt-4 md:hidden text-muted-foreground">
  <span className="text-xs font-mono opacity-60">ver bandeja</span>
  <svg
    className="w-4 h-4 animate-bounce opacity-60"
    fill="none" viewBox="0 0 24 24" stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
</div>
```

---

## 12. Checklist de implementación

### Semana 1 — Bloqueos críticos y ranking técnico (impacto inmediato)

- [ ] **C3** `10.1` — Arreglar contraste modo claro (lima → verde oscuro ≥ 4.5:1)
- [ ] **H4** `3.1` — Cambiar redirección raíz de 302 a 301
- [ ] **H5** `4.1` — Estandarizar x-default hreflang en HTTP header, HTML y sitemap
- [ ] **H3** `5.1` — Añadir /about y /contact al sitemap con lastmod y hreflang reales
- [ ] **H11** `10.2` — Corregir line-height del H1 (ratio 1.0 → 1.15)
- [ ] **H12** `10.3` — Ampliar tap targets footer y selector de idioma a ≥ 48px

### Semana 2 — Confianza, legal y E-E-A-T

- [ ] **C2** `8.2` — Reescribir Política de Privacidad (RGPD/LOPDGDD, 450+ palabras)
- [ ] **H9** `8.3` — Ampliar páginas About (350+ palabras) y Terms (350+ palabras)
- [ ] **H7** `8.1` — Renderizar trust badge "5M correos" en el HTML del hero
- [ ] **H6** `7.1` — Corregir og:url en sub-páginas (bug metadata Next.js)
- [ ] **M9** `8.4` — Añadir enlace a la política de privacidad de Mail.tm
- [ ] **M8** `7.2` — Eliminar "correo fake" de meta keywords, añadir "correo temporal seguro"

### Semana 3 — Schema y datos estructurados

- [ ] **C1** `6.1` — Implementar FAQPage JSON-LD (6 preguntas existentes)
- [ ] **H10** `6.4` — Añadir BreadcrumbList de 2 elementos en todas las páginas internas
- [ ] **M2** `6.2` — Añadir HowTo JSON-LD para los 5 pasos de "Cómo funciona"
- [ ] **M3** `6.3` — Corregir WebApplication: applicationCategory, operatingSystem, featureList
- [ ] **H8** `6.5` — Planificar y crear perfiles externos para sameAs en Organización
- [ ] **H5** `8.5` — Estandarizar nombre de marca "TmpMail" en todo el sitio

### Semana 4 — Rendimiento, seguridad y pulido

- [ ] **H1** `2.1` — Resolver conflicto robots.txt GPTBot/ClaudeBot
- [ ] **H2** `1.1` — Activar CSP enforced (de report-only a enforced con nonces)
- [ ] **M1** `9.1` — Habilitar caché HTML en el edge de Cloudflare
- [ ] **M4** `9.2` — Corregir preconnect (eliminar same-origin, añadir api.tmpmailio.com)
- [ ] **M5** `10.4` — Abrir primer FAQ por defecto (`open` en `<details>`)
- [ ] **M6** `11.1` — Arreglar apple-touch-icon (HTTP 500)
- [ ] **M7** `5.1` — Verificar que lastmod del sitemap usa fechas reales (no `new Date()`)
- [ ] **M10** `11.2` — Añadir indicador de scroll al inbox en móvil
- [ ] **M3** `9.3` — Verificar altura del skeleton del email widget (sin CLS)

### Backlog (baja prioridad)

- [ ] **L1** `8.5` — Completar estandarización de nombre de marca
- [ ] **L2** `9.4` — Reducir delay de la animación del H1 hero (0.1s → 0)
- [ ] **L3** `7.4` — Añadir `<time datetime="">` a la fecha del footer
- [ ] **L4** `7.3` — Corregir og:image:alt (solo español en /es)
- [ ] **L5** `9.2` — Añadir preconnect para Google Fonts si se usan
- [ ] **L6** `6.3` — Añadir screenshot al schema WebApplication
- [ ] Añadir sameAs a Organization cuando existan perfiles verificados

---

## 13. Métricas de seguimiento

| Métrica | Baseline (2026-03-19) | Objetivo (4 semanas) |
|---|---|---|
| SEO Health Score | 68 / 100 | 82+ / 100 |
| TTFB (Cloudflare edge) | 345ms | < 80ms |
| LCP estimado (mobile) | ~1.5–2.5s | < 1.5s |
| Palabras visibles (homepage) | ~620 | 800+ |
| E-E-A-T Content Score | 57 / 100 | 72+ / 100 |
| Páginas en sitemap | 6 | 10 |
| Páginas con BreadcrumbList válida | 0 (homepage solo 1 item) | 5 |
| Schema types en homepage | 4 | 6 (+ FAQPage + HowTo) |
| Palabras en Privacy Policy | ~180 | 450+ |
| Contraste modo claro (acento) | 1.22:1 ❌ | ≥ 4.5:1 ✓ |
| CSP enforced | No | Sí |
| Tap targets footer ≥ 48px | No | Sí |
| WCAG SC 1.4.12 H1 | Fallo (1.0) | ✓ (1.15+) |

**Herramientas de verificación:**
- PageSpeed Insights → https://pagespeed.web.dev/ (LCP, INP, CLS, TTFB)
- Google Search Console → cobertura de indexación, errores de sitemap
- Schema Markup Validator → https://validator.schema.org/
- WAVE Accessibility Tool → https://wave.webaim.org/ (contraste, tap targets)
- Contrast Checker → https://webaim.org/resources/contrastchecker/
- Security Headers → https://securityheaders.com/
- robots.txt Tester → Google Search Console → Herramientas → robots.txt

---

## Apéndice — Archivos y rutas de Next.js a modificar

| Spec | Archivo | Tipo de cambio |
|---|---|---|
| 1.1 | `middleware.ts` | CSP nonce, header enforcement |
| 2.1 | `public/robots.txt` | Eliminar conflictos GPTBot/ClaudeBot |
| 3.1 | `middleware.ts` | Cambiar 302 → 301 en raíz |
| 4.1 | `middleware.ts` o `app/[locale]/layout.tsx` | x-default en HTTP Link header |
| 5.1 | `app/sitemap.ts` | Añadir /about, /contact; lastmod reales |
| 6.1 | `app/[locale]/page.tsx` | Añadir FAQPage JSON-LD |
| 6.2 | `app/[locale]/page.tsx` | Añadir HowTo JSON-LD |
| 6.3 | `lib/schema/webapp.ts` (o equivalente) | Corregir WebApplication properties |
| 6.4 | `app/[locale]/[page]/page.tsx` × 4 | Añadir BreadcrumbList en sub-páginas |
| 7.1 | `app/[locale]/*/page.tsx` × 4 | Corregir generateMetadata og:url |
| 7.2 | `app/[locale]/page.tsx` | Actualizar meta keywords |
| 7.3 | `app/[locale]/page.tsx` | Corregir og:image:alt locale |
| 7.4 | Componente del footer | Añadir `<time>` element |
| 8.1 | Componente HeroSection | Renderizar trust badge en HTML |
| 8.2 | `app/[locale]/privacy/page.tsx` | Reescribir contenido Privacy (450+ words) |
| 8.3 | `app/[locale]/about/page.tsx` | Ampliar About (350+ words) |
| 8.3 | `app/[locale]/terms/page.tsx` | Ampliar Terms (350+ words) |
| 8.4 | `app/[locale]/privacy/page.tsx` | Añadir enlace a Mail.tm privacy |
| 8.5 | Footer, schema Organization | Estandarizar nombre "TmpMail" |
| 9.1 | `next.config.js` | Cache-Control headers para HTML |
| 9.2 | `app/layout.tsx` | Corregir preconnect hints |
| 9.3 | Componente del email widget | Verificar altura skeleton |
| 9.4 | `globals.css` | Reducir delay animación H1 |
| 10.1 | `globals.css` o variables CSS | Corregir color acento modo claro |
| 10.2 | CSS del H1 o clase Tailwind | line-height del H1 |
| 10.3 | Footer component, Header/Nav component | Tap targets ≥ 48px |
| 10.4 | Componente FAQ | Primer `<details open>` |
| 11.1 | `public/apple-touch-icon.png` | Crear o corregir el archivo |
| 11.2 | Componente hero o layout | Añadir scroll indicator en móvil |
