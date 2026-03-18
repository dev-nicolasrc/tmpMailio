# TmpMail SEO Implementation Spec
**Sitio:** https://tmpmailio.com/es
**Fecha de auditoría:** 2026-03-18
**Stack:** Next.js App Router · nginx · Tailwind CSS · Framer Motion · Socket.IO · Lucide React

---

## Índice

1. [Infraestructura y servidor](#1-infraestructura-y-servidor)
2. [Seguridad HTTP](#2-seguridad-http)
3. [Rendimiento y Core Web Vitals](#3-rendimiento-y-core-web-vitals)
4. [Redirects y estructura de URLs](#4-redirects-y-estructura-de-urls)
5. [Hreflang e internacionalización](#5-hreflang-e-internacionalización)
6. [Sitemap XML](#6-sitemap-xml)
7. [robots.txt](#7-robotstxt)
8. [Canonicals](#8-canonicals)
9. [Schema / Structured Data](#9-schema--structured-data)
10. [Contenido y E-E-A-T](#10-contenido-y-e-e-a-t)
11. [On-Page SEO](#11-on-page-seo)
12. [Mobile y accesibilidad](#12-mobile-y-accesibilidad)
13. [JavaScript y bundle](#13-javascript-y-bundle)

---

## 1. Infraestructura y servidor

### 1.1 — Desplegar CDN (Cloudflare)

**Prioridad:** CRÍTICA
**Impacto:** TTFB de 695ms → <100ms para usuarios fuera de Brasil. El mayor impacto en LCP de toda la auditoría.

**Contexto:** El servidor origen tiene IP brasileña (`187.77.234.184`). El HTML ya está cacheado por el ISR de Next.js (`x-nextjs-cache: HIT`, `s-maxage=31536000`). Solo falta ponerlo en el edge.

**Pasos:**
1. Crear cuenta en Cloudflare (tier gratuito es suficiente).
2. Delegar los nameservers del dominio `tmpmailio.com` a Cloudflare.
3. Configurar el registro A del dominio apuntando al IP del servidor.
4. En Cloudflare → SSL/TLS → modo "Full (strict)".
5. En Cloudflare → Cache → "Cache Rules" → crear regla para `tmpmailio.com/*` con `Cache Level: Cache Everything` y respetar el `Cache-Control` que ya envía Next.js.
6. Verificar que `CF-Ray` aparece en los headers de respuesta.

**Verificación:**
```bash
curl -I https://tmpmailio.com/es | grep -i "cf-ray\|x-nextjs-cache\|server-timing"
```
Esperado: `CF-Ray: ...` presente, TTFB < 150ms desde Europa.

---

### 1.2 — Habilitar HTTP/2 en nginx

**Prioridad:** ALTA
**Impacto:** Carga paralela de los 11 chunks JS en lugar de serializada (límite de 6 conexiones de HTTP/1.1).

**Archivo:** `/etc/nginx/sites-available/tmpmailio.com` (o equivalente)

```nginx
# ANTES
listen 443 ssl;

# DESPUÉS
listen 443 ssl http2;
listen [::]:443 ssl http2;
```

**Nota:** Si se usa Cloudflare como CDN (spec 1.1), HTTP/2 queda habilitado automáticamente entre el usuario y Cloudflare. Habilitar H2 en nginx igual mejora la conexión Cloudflare→origen (HTTP/2 en el leg de origen).

**Verificación:**
```bash
curl -I --http2 https://tmpmailio.com/es 2>&1 | head -5
# Debe mostrar: HTTP/2 200
```

---

## 2. Seguridad HTTP

### 2.1 — Headers de seguridad en nginx

**Prioridad:** CRÍTICA (HSTS) / ALTA (resto)
**Contexto:** Ninguno de los siguientes headers está presente en la respuesta actual.

**Archivo:** `/etc/nginx/sites-available/tmpmailio.com`

```nginx
server {
    listen 443 ssl http2;
    server_name tmpmailio.com www.tmpmailio.com;

    # === SEGURIDAD ===
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;

    # Ocultar versión nginx y header X-Powered-By
    server_tokens off;
    proxy_hide_header X-Powered-By;

    # CSP — empezar en modo report-only para identificar fuentes necesarias
    # Cambiar a Content-Security-Policy una vez validado en staging
    add_header Content-Security-Policy-Report-Only "
        default-src 'self';
        script-src 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline';
        font-src 'self';
        img-src 'self' data:;
        connect-src 'self' wss://tmpmailio.com;
        report-uri /api/csp-report
    " always;

    # resto de la configuración...
}
```

**Alternativa si se usa Next.js para los headers** (`next.config.js`):
```js
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

**Tras validar la CSP en report-only**, cambiar `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.

**Verificación:**
```bash
curl -I https://tmpmailio.com/es | grep -iE "strict-transport|x-frame|x-content-type|referrer|permissions"
```
Esperado: los 5 headers presentes.

**Paso final — HSTS Preload:**
Una vez en producción y estable, enviar el dominio a https://hstspreload.org para inclusión en la lista preload de navegadores.

---

## 3. Rendimiento y Core Web Vitals

### 3.1 — Eliminar opacity:0 del SSR HTML (LCP blocker)

**Prioridad:** CRÍTICA
**Impacto:** Es el cambio de mayor impacto en LCP. Actualmente el H1 y la sección hero son invisibles hasta que Framer Motion hidrata y ejecuta la animación (~1.5–2s extra sobre el TTFB).

**Problema en el código actual:**
```jsx
// El componente renderiza esto en el servidor:
// <section style="opacity:0"> y <h1 style="opacity:0; transform:translateY(8px)">
// Framer Motion setea el estado inicial ANTES del primer paint.

<motion.section
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.4 }}
>
  <motion.h1
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 }}
  >
    Tu correo temporal está listo
  </motion.h1>
</motion.section>
```

**Solución A — Reemplazar con CSS `@keyframes` (recomendado):**

```css
/* globals.css o el archivo CSS global */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-animate {
  animation: fadeInUp 0.4s ease forwards;
}

.hero-title-animate {
  animation: fadeInUp 0.4s ease 0.1s forwards;
  /* El elemento es visible desde el inicio del parse,
     la animación solo dura 0.4s y luego queda en opacity:1 */
}
```

```jsx
// Reemplazar motion.section y motion.h1 por elementos normales con clases CSS
<section className="... hero-animate">
  <h1 className="... hero-title-animate">
    Tu correo temporal está listo
  </h1>
</section>
```

**Solución B — Si se quiere mantener Framer Motion en otros componentes:**
```jsx
// Usar suppressHydrationWarning y aplicar el estado inicial solo en el cliente
const [isMounted, setIsMounted] = useState(false)
useEffect(() => setIsMounted(true), [])

<motion.section
  initial={isMounted ? { opacity: 0 } : false}  // false = sin animación en SSR
  animate={{ opacity: 1 }}
>
```

**Solución recomendada:** Solución A. También permite eliminar Framer Motion como dependencia (ver spec 13.1).

**Verificación:** Con Chrome DevTools → Performance tab → verificar que el LCP element (H1) tiene `opacity > 0` en el primer frame pintado.

---

### 3.2 — Skeleton del email address debe tener altura exacta

**Prioridad:** ALTA
**Impacto:** Previene CLS (layout shift) cuando el email real reemplaza el skeleton al hidratar.

**Problema:** El skeleton usa `h-16` (64px). Si la altura del componente real del email difiere, hay CLS.

**Acción:**
1. Medir la altura exacta del componente del email address renderizado (con DevTools).
2. Ajustar el skeleton para que use exactamente la misma altura y el mismo `font-size`/`line-height`.
3. Añadir `aspect-ratio` o dimensiones explícitas si el componente usa padding variable.

```jsx
// Asegurarse de que el skeleton replica la estructura exacta del componente real
// MAL: solo la altura
<div className="h-16 animate-pulse bg-gray-200 rounded" />

// BIEN: replica el padding y tamaño de fuente del componente real
<div className="h-16 px-4 py-3 animate-pulse bg-gray-200 rounded" />
// donde h-16 + px-4 + py-3 deben coincidir con el componente real
```

---

### 3.3 — Investigar y resolver TTFB del servidor origen (~695–858ms)

**Prioridad:** ALTA (subsanado mayormente por spec 1.1 con CDN, pero el origen debe mejorar igual)

**Acciones:**
- Verificar que el ISR de Next.js está funcionando (`x-nextjs-cache: HIT`). Si aparece `MISS`, la página se está regenerando en cada request.
- Si el servidor está en Brasil y el dominio target es español, evaluar si conviene migrar el origen a Europa (España, Frankfurt).
- Asegurarse de que el `revalidate` del ISR está configurado para páginas estáticas como la homepage:

```js
// app/[locale]/page.tsx
export const revalidate = 3600 // revalidar cada hora, no en cada request
```

---

### 3.4 — Corregir fetchPriority="low" en el webpack runtime

**Prioridad:** MEDIA
**Problema:** Next.js genera `<link rel="preload" fetchPriority="low" href="webpack-...js">`. El webpack runtime debe ejecutarse antes que cualquier chunk dividido — marcarlo como `low` retrasa toda la cadena de ejecución JS.

**Acción:** Verificar si esto es configurable en la versión de Next.js utilizada. En versiones recientes, puede corregirse con:

```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}
```

Si no hay opción de configuración, reportar como issue en el repo de Next.js y monitorizar actualizaciones.

---

## 4. Redirects y estructura de URLs

### 4.1 — Cambiar redirect raíz de 307 a 301

**Prioridad:** ALTA
**Problema:** `https://tmpmailio.com/` → `https://tmpmailio.com/es` vía `307 Temporary Redirect`. Google no transfiere link equity por 307 y continúa recrawleando el origen. El destino además depende de la cookie `NEXT_LOCALE=es`, que Googlebot no almacena entre requests.

**Archivo:** `middleware.ts` (o donde se gestione la redirección de locale)

```ts
// ANTES — produce 307 o comportamiento basado en cookie
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const locale = request.cookies.get('NEXT_LOCALE')?.value ?? 'es'
  return NextResponse.redirect(new URL(`/${locale}`, request.url))
}

// DESPUÉS — 308 permanente a locale fijo, sin depender de cookie para crawlers
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Solo redirigir la raíz exacta
  if (pathname === '/') {
    const response = NextResponse.redirect(new URL('/es', request.url), 308)
    return response
  }
}
```

**Nota:** Usar `308` (Permanent Redirect preserving method) o `301`. Para Next.js con App Router, `308` es más correcto para POST requests, pero `301` es más compatible con todos los crawlers. Recomendado: **301**.

```ts
return NextResponse.redirect(new URL('/es', request.url), 301)
```

---

### 4.2 — Cambiar redirects de /privacy y /terms de 307 a 301

**Prioridad:** MEDIA
**Problema:** `https://tmpmailio.com/privacy` → `https://tmpmailio.com/es/privacy` vía `307`.

**Acción:** En el mismo `middleware.ts` o en `next.config.js`:

```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/privacy',
        destination: '/es/privacy',
        permanent: true, // genera 308
      },
      {
        source: '/terms',
        destination: '/es/terms',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/es/contact',
        permanent: true,
      },
    ]
  },
}
```

---

## 5. Hreflang e internacionalización

### 5.1 — Añadir x-default hreflang en el HTML `<head>`

**Prioridad:** MEDIA
**Problema:** Los tags actuales en `<head>` tienen `es` y `en` pero falta `x-default`. El HTTP header sí lo tiene, pero la implementación es inconsistente entre las tres fuentes (HTML, HTTP header, sitemap).

**Archivo:** Layout raíz o el componente que genera los `<link>` de hreflang.

```tsx
// app/[locale]/layout.tsx (o el layout que genere el <head>)
export default function Layout({ params }: { params: { locale: string } }) {
  return (
    <html lang={params.locale}>
      <head>
        <link rel="alternate" hreflang="es" href="https://tmpmailio.com/es" />
        <link rel="alternate" hreflang="en" href="https://tmpmailio.com/en" />
        <link rel="alternate" hreflang="x-default" href="https://tmpmailio.com/en" />
        {/* x-default apunta al inglés como idioma neutro/fallback */}
      </head>
      ...
    </html>
  )
}
```

**Nota sobre consistencia:** Actualmente el hreflang aparece en tres lugares (HTML, HTTP `Link` header, sitemap). Mantener los tres está permitido pero genera overhead. **Recomendación a largo plazo:** consolidar solo en HTML `<head>` y eliminar de HTTP headers y sitemap para reducir mantenimiento.

---

### 5.2 — Normalizar `hrefLang` camelCase a `hreflang` minúsculas

**Prioridad:** BAJA
**Problema:** El HTML usa el atributo `hrefLang` (camelCase de React), que el spec HTML define como `hreflang` en minúsculas. La mayoría de parsers son case-insensitive, pero la corrección es trivial.

**Acción:** En el componente que genera los links de hreflang, asegurarse de usar la prop correcta de React (que internamente genera el atributo en minúsculas):

```tsx
// React convierte automáticamente hrefLang → hreflang en el DOM
// Pero para claridad, usar el nombre correcto:
<link rel="alternate" hrefLang="es" href="..." />
// React lo renderiza como: <link rel="alternate" hreflang="es" href="..." />
// ✓ Correcto — React maneja la conversión
```

Verificar el HTML final generado con `curl https://tmpmailio.com/es | grep hreflang` y confirmar que aparece en minúsculas en el output.

---

### 5.3 — Añadir switcher de idioma en el header (no solo en el footer)

**Prioridad:** MEDIA
**Problema:** El toggle EN/ES solo existe en el footer. En un móvil de 375px requiere scroll completo para encontrarlo. Afecta UX y reduce la señal de navegación para crawlers.

**Acción:** Añadir el toggle de idioma en el `<header>` principal junto al toggle de tema (dark/light), antes del elemento `<main>`.

```tsx
// components/Header.tsx
<header>
  <nav>
    <a href="/" aria-label="TmpMail">
      <Logo />
    </a>
    <div className="flex items-center gap-2">
      <LocaleSwitcher />   {/* Añadir aquí */}
      <ThemeToggle />
    </div>
  </nav>
</header>
```

---

## 6. Sitemap XML

### 6.1 — Añadir x-default a las entradas del sitemap

**Prioridad:** MEDIA
**Archivo:** `app/sitemap.ts` (o donde se genere el sitemap)

```ts
// app/sitemap.ts
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tmpmailio.com'
  const lastModified = new Date()

  const hreflangAlternates = [
    { hreflang: 'x-default', url: `${baseUrl}/` },
    { hreflang: 'es', url: `${baseUrl}/es` },
    { hreflang: 'en', url: `${baseUrl}/en` },
  ]

  return [
    {
      url: `${baseUrl}/es`,
      lastModified,
      alternates: { languages: { 'x-default': `${baseUrl}/`, es: `${baseUrl}/es`, en: `${baseUrl}/en` } },
    },
    {
      url: `${baseUrl}/en`,
      lastModified,
      alternates: { languages: { 'x-default': `${baseUrl}/`, es: `${baseUrl}/es`, en: `${baseUrl}/en` } },
    },
    {
      url: `${baseUrl}/es/privacy`,
      lastModified,
      alternates: { languages: { 'x-default': `${baseUrl}/en/privacy`, es: `${baseUrl}/es/privacy`, en: `${baseUrl}/en/privacy` } },
    },
    {
      url: `${baseUrl}/en/privacy`,
      lastModified,
      alternates: { languages: { 'x-default': `${baseUrl}/en/privacy`, es: `${baseUrl}/es/privacy`, en: `${baseUrl}/en/privacy` } },
    },
    {
      url: `${baseUrl}/es/terms`,
      lastModified,
      alternates: { languages: { 'x-default': `${baseUrl}/en/terms`, es: `${baseUrl}/es/terms`, en: `${baseUrl}/en/terms` } },
    },
    {
      url: `${baseUrl}/en/terms`,
      lastModified,
      alternates: { languages: { 'x-default': `${baseUrl}/en/terms`, es: `${baseUrl}/es/terms`, en: `${baseUrl}/en/terms` } },
    },
  ]
}
```

**Nota:** Si Next.js no soporta `alternates` en `MetadataRoute.Sitemap`, generar el XML manualmente en `app/sitemap.xml/route.ts`.

**Eliminar de la salida del sitemap:** `<changefreq>` y `<priority>` — Google los ignora desde 2023.

---

### 6.2 — Añadir subpáginas al sitemap (después de corregir canonicals)

**Dependencia:** Requiere que spec 8.1 (canonicals) esté implementado primero.
**Prioridad:** MEDIA

Las páginas `/es/privacy`, `/es/terms`, `/en/privacy`, `/en/terms` deben incluirse en el sitemap solo después de que sus canonicals apunten a sí mismas (y no a la homepage).

---

## 7. robots.txt

### 7.1 — Corregir bloque de bots de IA (User-Agent apilados)

**Prioridad:** MEDIA
**Problema:** El spec de robots.txt no permite apilar múltiples `User-Agent` antes de una directiva sin separar con línea en blanco. El bloque actual es ambiguo para algunos parsers.

**Archivo:** `public/robots.txt`

```txt
# ANTES (ambiguo)
User-Agent: GPTBot
User-Agent: ClaudeBot
User-Agent: PerplexityBot
Allow: /

# DESPUÉS (correcto)
User-Agent: GPTBot
Allow: /

User-Agent: ClaudeBot
Allow: /

User-Agent: PerplexityBot
Allow: /

Sitemap: https://tmpmailio.com/sitemap.xml
```

**robots.txt final completo:**
```txt
User-Agent: *
Allow: /
Disallow: /api/
Disallow: /internal/

User-Agent: GPTBot
Allow: /

User-Agent: ClaudeBot
Allow: /

User-Agent: PerplexityBot
Allow: /

Sitemap: https://tmpmailio.com/sitemap.xml
```

---

## 8. Canonicals

### 8.1 — Corregir canonical tags en todas las subpáginas

**Prioridad:** CRÍTICA
**Problema:** Las páginas `/es/privacy`, `/es/terms`, `/en/privacy`, `/en/terms` tienen canonical apuntando a su homepage de idioma en lugar de a sí mismas. Google las trata como duplicados y no las indexa.

**Archivo:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, etc.

```tsx
// app/[locale]/privacy/page.tsx

// ANTES (incorrecto — genera canonical a /es en vez de /es/privacy)
export const metadata: Metadata = {
  // sin canonical declarado, Next.js hereda el del layout padre
}

// DESPUÉS (correcto)
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const { locale } = params
  return {
    alternates: {
      canonical: `https://tmpmailio.com/${locale}/privacy`,
      languages: {
        es: 'https://tmpmailio.com/es/privacy',
        en: 'https://tmpmailio.com/en/privacy',
        'x-default': 'https://tmpmailio.com/en/privacy',
      },
    },
  }
}
```

Aplicar el mismo patrón a `terms`, `contact`, y cualquier otra subpágina.

**Verificación:**
```bash
curl -s https://tmpmailio.com/es/privacy | grep -i "canonical"
# Debe mostrar: <link rel="canonical" href="https://tmpmailio.com/es/privacy"/>
```

---

## 9. Schema / Structured Data

### 9.1 — Eliminar el bloque FAQPage

**Prioridad:** CRÍTICA
**Razón:** Google restringió los rich results de FAQPage a sitios gubernamentales y de salud en agosto de 2023. TmpMail es un servicio comercial — este schema nunca generará un rich result. El contenido FAQ puede permanecer en la página.

**Acción:** Eliminar completamente el bloque JSON-LD de tipo `FAQPage` del componente o layout donde esté definido.

```tsx
// Buscar y eliminar el bloque:
// <script type="application/ld+json">
//   { "@context": "https://schema.org", "@type": "FAQPage", ... }
// </script>
```

---

### 9.2 — Corregir el bloque WebApplication

**Prioridad:** ALTA
**Problemas actuales:**
- `url` apunta a `https://tmpmailio.com` en vez de `https://tmpmailio.com/es`
- `description` y `featureList` están en inglés en la página española
- Falta `@id`, `isAccessibleForFree`, `image`, `publisher`

**Reemplazar el bloque actual por:**

```tsx
// app/[locale]/page.tsx o el componente donde se declare el schema
const webAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': `https://tmpmailio.com/${locale}#webapp`,
  name: 'TmpMail',
  url: `https://tmpmailio.com/${locale}`,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript',
  inLanguage: locale === 'es' ? ['es', 'en'] : ['en', 'es'],
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  description: locale === 'es'
    ? 'Servicio gratuito de correo temporal desechable. Crea una dirección en segundos, sin registro, sin spam.'
    : 'Free disposable temporary email service. Create an address in seconds, no registration, no spam.',
  featureList: locale === 'es'
    ? [
        'Creación instantánea de correo temporal',
        'Sin registro requerido',
        'Entrega de correo en tiempo real',
        'Expiración automática en 10 minutos con extensión automática',
        'Soporte de archivos adjuntos hasta 5 MB',
        'Generación de código QR',
      ]
    : [
        'Instant temporary email creation',
        'No registration required',
        'Real-time email delivery',
        'Automatic 10-minute expiration with auto-extension',
        'Attachment support up to 5 MB',
        'QR code generation',
      ],
  image: `https://tmpmailio.com/${locale}/opengraph-image`,
  author: {
    '@type': 'Organization',
    name: 'TmpMail',
    url: 'https://tmpmailio.com',
  },
  publisher: {
    '@type': 'Organization',
    name: 'TmpMail',
    url: 'https://tmpmailio.com',
  },
}
```

---

### 9.3 — Añadir schema WebSite y Organization en el layout raíz

**Prioridad:** ALTA
**Dónde:** `app/layout.tsx` (layout raíz, fuera del layout de locale) — se renderiza una sola vez para todo el sitio.

```tsx
// app/layout.tsx
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://tmpmailio.com/#website',
  name: 'TmpMail',
  alternateName: ['Correo Temporal Gratis', 'Temporary Email'],
  url: 'https://tmpmailio.com',
  inLanguage: ['es', 'en'],
  description: 'Servicio gratuito de correo temporal desechable.',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://tmpmailio.com/#organization',
  name: 'TmpMail',
  url: 'https://tmpmailio.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://tmpmailio.com/logo.png', // reemplazar con URL real del logo
    width: 512,
    height: 512,
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contacto@tmpmailio.com',
    contactType: 'customer support',
    availableLanguage: ['Spanish', 'English'],
  },
  description: 'Proveedor de servicio de correo temporal desechable.',
  areaServed: 'Worldwide',
  // Añadir sameAs cuando existan perfiles verificados:
  // sameAs: ['https://github.com/...', 'https://www.producthunt.com/...']
}

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

**Nota sobre el logo:** Crear una imagen PNG dedicada de 512x512px para el logo. El `favicon.ico` actual funcionará pero Google prefiere una imagen PNG de alta resolución con fondo limpio.

---

### 9.4 — Añadir BreadcrumbList en páginas de locale y subpáginas

**Prioridad:** MEDIA
**Dónde:** `app/[locale]/layout.tsx` y los page components de subpáginas.

```tsx
// Para /es (homepage de locale)
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'TmpMail', item: 'https://tmpmailio.com' },
    { '@type': 'ListItem', position: 2, name: locale === 'es' ? 'Español' : 'English', item: `https://tmpmailio.com/${locale}` },
  ],
}

// Para /es/privacy
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'TmpMail', item: 'https://tmpmailio.com' },
    { '@type': 'ListItem', position: 2, name: 'Español', item: 'https://tmpmailio.com/es' },
    { '@type': 'ListItem', position: 3, name: 'Política de Privacidad', item: 'https://tmpmailio.com/es/privacy' },
  ],
}
```

---

## 10. Contenido y E-E-A-T

### 10.1 — Añadir cuerpo de texto visible en la homepage (crítico)

**Prioridad:** CRÍTICA
**Problema:** Solo ~99 palabras visibles. Cero párrafos de cuerpo. El único contenido sustancial está en un acordeón colapsado con JS.
**Objetivo:** Alcanzar mínimo 500 palabras indexables como HTML estático visible.

**Secciones a añadir después del widget principal:**

#### Sección 1 — "¿Qué es TmpMail?" (~150 palabras)
```tsx
<section aria-labelledby="que-es-tmpmail">
  <h2 id="que-es-tmpmail">¿Qué es TmpMail?</h2>
  <p>
    TmpMail es un servicio de correo temporal gratuito que genera una dirección de email
    desechable en segundos, sin necesidad de registro ni contraseña. La dirección se crea
    automáticamente al abrir la página y expira tras 10 minutos de inactividad — o se extiende
    automáticamente cada vez que llega un nuevo mensaje.
  </p>
  <p>
    Ideal para registrarte en servicios que no conoces, probar aplicaciones, evitar el spam
    en tu bandeja principal, o en cualquier situación donde necesites un email real pero
    temporal. Los mensajes llegan en tiempo real y pueden incluir archivos adjuntos de hasta 5 MB.
  </p>
</section>
```

#### Sección 2 — "Cómo funciona" (~120 palabras)
```tsx
<section aria-labelledby="como-funciona">
  <h2 id="como-funciona">Cómo funciona</h2>
  <ol>
    <li>
      <strong>Abre la página</strong> — Tu dirección temporal se genera automáticamente.
      No hay formularios, no hay registro, no hay contraseña.
    </li>
    <li>
      <strong>Usa el email donde lo necesites</strong> — Cópialo con un clic y úsalo en
      cualquier formulario de registro o verificación.
    </li>
    <li>
      <strong>Recibe los mensajes al instante</strong> — Los correos entrantes aparecen
      en tu bandeja en tiempo real. Puedes ver el contenido completo y los adjuntos.
    </li>
    <li>
      <strong>Se autodestruye solo</strong> — Tras 10 minutos sin actividad, la dirección
      y todos sus mensajes se eliminan permanentemente de nuestros servidores.
    </li>
  </ol>
</section>
```

#### Sección 3 — "Por qué usar un correo temporal" (~120 palabras)
```tsx
<section aria-labelledby="por-que">
  <h2 id="por-que">Por qué usar un correo temporal</h2>
  <ul>
    <li><strong>Evitar spam:</strong> Regístrate en servicios de prueba sin llenar tu inbox real de boletines no deseados.</li>
    <li><strong>Proteger tu privacidad:</strong> No dejes rastro de tu email principal en sitios de dudosa reputación.</li>
    <li><strong>Verificaciones rápidas:</strong> Confirma tu cuenta en segundos sin abrir otra pestaña.</li>
    <li><strong>Pruebas de desarrollo:</strong> Los desarrolladores usan TmpMail para probar flujos de registro y notificaciones por email sin contaminar su inbox.</li>
    <li><strong>Cero datos almacenados:</strong> No guardamos tu IP ni ningún dato personal. Los mensajes se eliminan automáticamente.</li>
  </ul>
</section>
```

---

### 10.2 — Renderizar las respuestas del FAQ como HTML visible

**Prioridad:** ALTA
**Problema:** Las respuestas del FAQ existen solo en JSON-LD y en el acordeón JS colapsado. No son DOM text visible en el primer render.

**Solución:** Mantener el acordeón para la UX, pero añadir una sección de FAQ con el texto renderizado estáticamente debajo (puede estar visualmente oculta con CSS para no duplicar la experiencia visual, pero presente en el DOM para indexación).

**Opción A — FAQ visible estáticamente bajo el acordeón:**
```tsx
// Renderizar las Q&A como HTML estático en una <section> separada
// que use un <details>/<summary> nativo en lugar de JS custom accordion
<section aria-label="Preguntas frecuentes">
  <h2>Preguntas frecuentes</h2>
  {faqs.map((faq) => (
    <details key={faq.question}>
      <summary>{faq.question}</summary>
      <p>{faq.answer}</p>
    </details>
  ))}
</section>
```

El elemento `<details>/<summary>` nativo de HTML no requiere JavaScript, es accesible, y Google indexa su contenido como texto visible del DOM.

**Opción B — Mantener el acordeón JS pero pre-renderizar el texto:**
```tsx
// Asegurarse de que el texto de la respuesta se renderiza en el SSR HTML
// aunque esté oculto con aria-hidden o height:0 visualmente
<div aria-hidden="true" style={{ height: 0, overflow: 'hidden', position: 'absolute' }}>
  {faqs.map((faq) => (
    <p key={faq.question}>{faq.answer}</p>
  ))}
</div>
```

Recomendada: **Opción A** con `<details>/<summary>`. Es semánticamente correcto, accesible, y elimina la dependencia de JS para la interacción.

---

### 10.3 — Añadir señal de prueba social / uso

**Prioridad:** MEDIA
**Impacto:** E-E-A-T — señal de Experience. Incluso un contador simple aumenta la credibilidad.

**Ejemplo:**
```tsx
<p className="text-sm text-muted">
  Más de <strong>X millones de correos</strong> temporales generados
</p>
```

Si existe un endpoint de estadísticas, mostrar el número real. Si no, implementar un contador básico en la base de datos.

---

### 10.4 — Añadir página /es/sobre-nosotros o /about

**Prioridad:** MEDIA
**Impacto:** E-E-A-T — señal de Authoritativeness y Trustworthiness. Sin una página de "sobre nosotros", Google no puede verificar quién opera el servicio.

**Contenido mínimo:**
- Nombre o descripción de la entidad que opera el servicio
- Email de contacto (`contacto@tmpmailio.com`) visible
- Declaración de privacidad resumida (no datos almacenados, sin IP)
- Enlace a la política de privacidad completa
- Opcional: año de fundación, tecnología usada (Next.js, Redis, Mail.tm)

**Enlazar desde:** footer de todas las páginas y desde la navegación principal.

---

## 11. On-Page SEO

### 11.1 — Expandir meta title a 50-60 caracteres

**Prioridad:** MEDIA
**Actual:** `TmpMail — Correo Temporal Gratis` (32 caracteres — 28 bajo el mínimo óptimo)

**Propuesta (ES):** `TmpMail — Correo Temporal Gratis y Desechable | Sin Registro` (59 caracteres)
**Propuesta (EN):** `TmpMail — Free Disposable Temporary Email | No Registration` (57 caracteres)

```tsx
// app/[locale]/page.tsx
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  return {
    title: params.locale === 'es'
      ? 'TmpMail — Correo Temporal Gratis y Desechable | Sin Registro'
      : 'TmpMail — Free Disposable Temporary Email | No Registration',
  }
}
```

---

### 11.2 — Extender meta description a 130-155 caracteres

**Prioridad:** MEDIA
**Actual:** `Crea un correo desechable en segundos. Sin registro, sin spam. Tu email temporal se autodestruye en 10 minutos.` (111 caracteres)

**Propuesta (ES):** `Crea tu correo desechable gratis en segundos. Sin registro, sin spam, sin datos guardados. Tu email temporal se autodestruye en 10 minutos y protege tu privacidad.` (166 caracteres — recortar a ~155)

```tsx
description: params.locale === 'es'
  ? 'Crea tu correo desechable gratis en segundos. Sin registro, sin spam, sin datos guardados. Tu email temporal expira en 10 minutos y protege tu privacidad.'
  : 'Create a free disposable email in seconds. No registration, no spam, no data stored. Your temporary inbox expires in 10 minutes and protects your privacy.',
```

---

### 11.3 — Añadir H1 semánticamente descriptivo (además del actual)

**Prioridad:** BAJA
**Problema:** El H1 actual ("Tu correo temporal está listo") es un mensaje de estado de la UI, no una declaración topical. Para SEO, el H1 debería comunicar el tema de la página.

**Opción sin cambiar la UI:** Añadir un H1 visualmente oculto pero presente en el DOM:
```tsx
<h1 className="sr-only">Correo Temporal Gratis — TmpMail</h1>
<p aria-live="polite" className="text-3xl font-bold">
  Tu correo temporal está listo
</p>
```

**Opción recomendada:** Cambiar el H1 de la UI a algo que funcione tanto como mensaje de estado como keyword:
```
"Tu correo temporal está listo"  →  "TmpMail: Tu correo temporal desechable y gratuito"
```
y debajo mostrar el subtítulo como `<p>` o `<h2>`.

---

### 11.4 — Añadir og:locale:alternate para la versión en inglés

**Prioridad:** BAJA

```tsx
// En el metadata de la página
openGraph: {
  locale: 'es_ES',
  alternateLocale: ['en_US'],
  // ...
}
```

---

## 12. Mobile y accesibilidad

### 12.1 — Aumentar tamaños de fuente mínimos

**Prioridad:** ALTA
**Problema:** 16 elementos usan `text-[10px]` (6.25% below Google's 12px minimum). 5 botones usan `text-[11px]`.

**Acción en Tailwind:**
```tsx
// Buscar y reemplazar en todos los componentes:
text-[10px]  →  text-xs     (12px — mínimo absoluto)
text-[11px]  →  text-xs     (12px)
text-xs      →  text-sm     (14px — recomendado para etiquetas)

// Para el body base en globals.css:
// ANTES
body { font-size: 13px; }

// DESPUÉS
body { font-size: 14px; }  /* o 16px si el diseño lo permite */
```

---

### 12.2 — Aumentar touch targets de botones

**Prioridad:** ALTA
**Problema:** Los botones `.btn-flat` tienen ~30-32px de altura. El mínimo recomendado por Google para mobile es 44px.

**Acción en CSS:**
```css
/* ANTES */
.btn-flat {
  padding: 6px 14px;
}

/* DESPUÉS */
.btn-flat {
  padding: 10px 16px;   /* mínimo para alcanzar ~44px con font-size 14px */
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
```

O con Tailwind: cambiar `py-1.5` por `py-2.5` en los botones.

---

### 12.3 — Añadir aria-label al botón de refresh

**Prioridad:** BAJA

```tsx
// ANTES
<button title="Actualizar bandeja">
  <RefreshCw />
</button>

// DESPUÉS
<button title="Actualizar bandeja" aria-label="Actualizar bandeja de entrada">
  <RefreshCw aria-hidden="true" />
</button>
```

---

### 12.4 — Investigar y reparar el service worker (devuelve 500)

**Prioridad:** BAJA
**Problema:** `GET /sw.js` → HTTP 500. Si el service worker está implementado para PWA offline, está roto. Si no es intencional, limpiar la referencia.

**Acción:**
1. Verificar si hay referencia a un service worker en el `manifest.json` o en el código.
2. Si no es necesario: eliminar cualquier `navigator.serviceWorker.register()` del código.
3. Si es necesario: depurar el error 500 en el servidor (posiblemente un error de Next.js al servir el archivo estático).

---

## 13. JavaScript y bundle

### 13.1 — Eliminar Framer Motion

**Prioridad:** ALTA
**Tamaño actual:** 172 KB (uncompressed)
**Usos detectados:** Animación de entrada del hero (section + h1) y fade-in del modal de QR.

**Plan de migración:**

1. Reemplazar las animaciones de entrada del hero con CSS `@keyframes` (ver spec 3.1).
2. Reemplazar el fade-in del modal QR:

```css
/* modal-animation.css */
@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

.modal-enter {
  animation: modalFadeIn 0.2s ease forwards;
}
```

```tsx
// Antes: <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
// Después:
<div className="modal-enter">
  {/* contenido del modal */}
</div>
```

3. Desinstalar Framer Motion: `npm uninstall framer-motion`

**Ahorro:** ~172 KB JS, también resuelve spec 3.1 (LCP).

---

### 13.2 — Usar imports individuales de Lucide React

**Prioridad:** ALTA
**Tamaño actual:** ~182 KB (bundle completo de Lucide)
**Ahorro esperado:** ~175 KB

```tsx
// ANTES — importa la librería completa
import { Moon, Sun, Copy, Check, RefreshCw, QrCode, Bell, BellOff, Trash, X } from 'lucide-react'

// DESPUÉS — imports individuales (solo descarga los iconos usados)
import Moon from 'lucide-react/dist/esm/icons/moon'
import Sun from 'lucide-react/dist/esm/icons/sun'
import Copy from 'lucide-react/dist/esm/icons/copy'
import Check from 'lucide-react/dist/esm/icons/check'
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw'
import QrCode from 'lucide-react/dist/esm/icons/qr-code'
import Bell from 'lucide-react/dist/esm/icons/bell'
import BellOff from 'lucide-react/dist/esm/icons/bell-off'
import Trash from 'lucide-react/dist/esm/icons/trash'
import X from 'lucide-react/dist/esm/icons/x'
```

**Alternativa con next.config.js (más limpia):**
```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}
```
Con `optimizePackageImports`, Next.js hace el tree-shaking automáticamente y los imports con nombre siguen funcionando sin cambios.

---

### 13.3 — Evaluar reemplazar Socket.IO con WebSocket nativo

**Prioridad:** MEDIA
**Tamaño actual:** ~124 KB (cliente Socket.IO completo con polling fallback)
**Ahorro esperado:** ~120 KB si se usa WebSocket nativo

**Evaluar primero:** ¿El servidor usa características específicas de Socket.IO (rooms, namespaces, eventos personalizados, reconexión automática)? Si la comunicación es simple bidireccional para entregar emails:

```ts
// Reemplazo simple con WebSocket nativo + reconexión
function createMailSocket(emailAddress: string, onMessage: (email: Email) => void) {
  let ws: WebSocket
  let retries = 0

  function connect() {
    ws = new WebSocket(`wss://tmpmailio.com/ws?email=${emailAddress}`)

    ws.onmessage = (event) => {
      const email = JSON.parse(event.data)
      onMessage(email)
    }

    ws.onclose = () => {
      if (retries < 10) {
        setTimeout(connect, Math.min(1000 * 2 ** retries, 30000))
        retries++
      }
    }

    ws.onopen = () => { retries = 0 }
  }

  connect()
  return () => ws.close()
}
```

**Nota:** Solo implementar si el servidor soporta WebSocket puro. Si depende de las features de Socket.IO en el servidor, este cambio requiere modificar también el backend.

---

## Checklist de implementación por prioridad

### Semana 1 — Infraestructura y bloqueos críticos
- [ ] **1.1** Desplegar Cloudflare CDN
- [ ] **2.1** Añadir headers de seguridad nginx (HSTS + 5 headers)
- [ ] **3.1** Eliminar opacity:0 del SSR HTML (hero + H1) → reemplazar con CSS @keyframes
- [ ] **4.1** Cambiar redirect raíz de 307 a 301
- [ ] **8.1** Corregir canonical tags en /privacy, /terms, /contact (todas las locales)
- [ ] **9.1** Eliminar bloque FAQPage JSON-LD

### Semana 2 — Contenido y schema
- [ ] **10.1** Añadir 3 secciones de cuerpo de texto (¿Qué es?, Cómo funciona, Por qué)
- [ ] **10.2** Renderizar FAQ como HTML estático (`<details>/<summary>`)
- [ ] **9.2** Corregir WebApplication schema (url, description en ES, campos faltantes)
- [ ] **9.3** Añadir WebSite + Organization JSON-LD en layout raíz
- [ ] **11.1** Expandir meta title a 50-60 caracteres
- [ ] **11.2** Extender meta description a 130-155 caracteres

### Semana 3 — Rendimiento y técnico
- [ ] **1.2** Habilitar HTTP/2 en nginx
- [ ] **13.1** Eliminar Framer Motion → CSS animations
- [ ] **13.2** Usar imports individuales de Lucide (o `optimizePackageImports`)
- [ ] **12.1** Aumentar font sizes mínimos (10px → 12px+)
- [ ] **12.2** Aumentar touch targets de botones a mínimo 44px
- [ ] **5.1** Añadir x-default hreflang en HTML head
- [ ] **7.1** Corregir robots.txt (bloques de bots de IA separados)
- [ ] **4.2** Cambiar /privacy y /terms de 307 a 301

### Semana 4 — Optimizaciones y contenido adicional
- [ ] **6.1** Actualizar sitemap (x-default, subpáginas, eliminar changefreq/priority)
- [ ] **9.4** Añadir BreadcrumbList en locale pages y subpáginas
- [ ] **10.3** Añadir señal de prueba social (contador de emails)
- [ ] **10.4** Crear página /es/sobre-nosotros
- [ ] **3.2** Verificar y corregir altura del skeleton del email
- [ ] **5.3** Mover language switcher al header
- [ ] **12.4** Investigar y reparar service worker (500)

### Backlog
- [ ] **13.3** Evaluar reemplazar Socket.IO con WebSocket nativo
- [ ] **3.3** Investigar TTFB del origen (ISR revalidation, posible migración del servidor)
- [ ] **11.3** Revisar H1 semántico vs. mensaje de UI
- [ ] **11.4** Añadir og:locale:alternate
- [ ] **10.4** Blog/recursos para topical authority
- [ ] Añadir `sameAs` a Organization schema cuando existan perfiles externos verificados
- [ ] Investigar `fetchPriority="low"` en webpack chunk (spec 3.4)
- [ ] Eliminar `X-Powered-By` y versión nginx de headers

---

## Métricas de seguimiento post-implementación

| Métrica | Baseline actual | Objetivo tras implementación |
|---|---|---|
| SEO Health Score | 51/100 | 75+/100 |
| LCP (lab, mobile) | ~3–5s (estimado) | <2.5s |
| TTFB | 695ms | <150ms (con CDN) |
| JS Bundle (uncompressed) | 713 KB | <250 KB |
| Palabras visibles en homepage | ~99 | 500+ |
| E-E-A-T Content Score | 38/100 | 65+/100 |
| Páginas indexadas por Google | 2 (solo /es y /en) | 6+ |
| Security headers presentes | 0/6 | 6/6 |

**Herramientas de verificación:**
- PageSpeed Insights: https://pagespeed.web.dev/ → medir LCP, INP, CLS
- Google Search Console: verificar cobertura de indexación tras corregir canonicals
- Schema Markup Validator: https://validator.schema.org/
- Security Headers: https://securityheaders.com/
- HSTS Preload Check: https://hstspreload.org/
