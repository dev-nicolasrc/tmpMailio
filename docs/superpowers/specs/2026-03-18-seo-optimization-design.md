# SEO Optimization — Design Spec
**Sitio:** https://tmpmailio.com
**Fecha:** 2026-03-18
**Stack:** Next.js App Router · nginx · Tailwind CSS · Framer Motion · Socket.IO · Lucide React
**Referencia:** `/docs/tmpmailio-seo-spec.md`

---

## Contexto

TmpMail es un servicio de correo temporal disponible en `/es` y `/en`. La auditoría SEO de 2026-03-18 identificó 30+ issues distribuidos en 13 categorías. El impacto más crítico es el LCP bloqueado por Framer Motion (opacity:0 en SSR), canonicals rotos en subpáginas, contenido insuficiente (~99 palabras visibles), y la falta de CDN.

## Enfoque general

Tres ramas/PRs independientes ordenadas por prioridad. Cada fase se deployea y verifica con Google Search Console antes de iniciar la siguiente. Esto permite medir el impacto de las mejoras críticas (LCP, canonicals, contenido) antes de invertir tiempo en items de menor prioridad.

**Decisiones clave:**
- Framer Motion se elimina completamente (no parcialmente) — reemplazado con CSS `@keyframes`
- El copy de contenido (ES + EN, ~500 palabras) se genera dentro del plan, listo para insertar
- Socket.IO se audita pero no se migra en este ciclo
- Los archivos de configuración de nginx/Cloudflare se generan como docs de infraestructura

---

## Fase 1 — Cambios CRÍTICOS

**Rama:** `feat/seo-phase-1-critical`
**Objetivo:** Resolver los blockers de indexación y LCP más severos.

### 1.1 — Eliminar opacity:0 del SSR HTML (Spec 3.1)

**Problema:** El hero (`motion.section`) y el H1 (`motion.h1`) renderizan con `opacity:0` en el HTML del servidor. Framer Motion los anima client-side con 1.5-2s de delay, bloqueando el LCP.

**Solución:** Reemplazar `motion.section` y `motion.h1` en el hero por elementos HTML regulares con animación CSS:

```css
/* globals.css */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}
```

```tsx
/* page.tsx — antes */
<motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

/* page.tsx — después */
<section className="animate-fade-in-up">
```

**Archivos:** `app/[locale]/page.tsx`, `app/globals.css`
**Verificación:** DevTools Performance → LCP element debe tener opacity>0 en el primer frame de paint.

---

### 1.2 — Corregir canonical tags en subpáginas (Spec 8.1)

**Problema:** `/es/privacy`, `/es/terms`, `/en/privacy`, `/en/terms` tienen el canonical apuntando a la homepage en lugar de a sí mismas. Google las trata como duplicados y no las indexa.

**Solución:** Añadir `generateMetadata` a cada subpágina:

```tsx
// app/[locale]/privacy/page.tsx
export async function generateMetadata({ params }: { params: { locale: string } }) {
  const { locale } = params;
  return {
    alternates: {
      canonical: `https://tmpmailio.com/${locale}/privacy`,
      languages: {
        es: 'https://tmpmailio.com/es/privacy',
        en: 'https://tmpmailio.com/en/privacy',
        'x-default': 'https://tmpmailio.com/en/privacy',
      },
    },
  };
}
```

**Archivos:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`
**Verificación:** `curl -s https://tmpmailio.com/es/privacy | grep -i "canonical"`

---

### 1.3 — Eliminar bloque FAQPage JSON-LD (Spec 9.1)

**Problema:** Desde agosto 2023, Google restringió los rich results de FAQPage a sitios gubernamentales y de salud. El bloque JSON-LD no produce ningún resultado enriquecido y añade peso innecesario al HTML.

**Solución:** Eliminar completamente el script `<script type="application/ld+json">` con `@type: "FAQPage"`.

**Archivos:** `app/[locale]/page.tsx`

---

### 1.4 — Añadir contenido visible en homepage (Spec 10.1)

**Problema:** Solo ~99 palabras visibles en el HTML estático. El contenido del FAQ está en un accordion JS colapsado y no es indexable en el primer render.

**Solución:** Añadir 3 secciones de contenido semántico después del widget de email y antes del FAQ. El copy se incluye en los archivos de traducción (`messages/es.json`, `messages/en.json`).

**Estructura:**

```tsx
<section id="about">
  <h2>{t('about.title')}</h2>
  <p>{t('about.body')}</p>
</section>

<section id="how-it-works">
  <h2>{t('howItWorks.title')}</h2>
  <ol>
    <li>{t('howItWorks.step1')}</li>
    {/* ... */}
  </ol>
</section>

<section id="why-use">
  <h2>{t('whyUse.title')}</h2>
  <ul>
    <li>{t('whyUse.reason1')}</li>
    {/* ... */}
  </ul>
</section>
```

**Copy ES (~500 palabras):**

```json
{
  "about": {
    "title": "¿Qué es TmpMail?",
    "body": "TmpMail es un servicio de correo electrónico temporal y desechable que te permite crear una dirección de email en segundos, sin registro y sin contraseña. Cada dirección generada es única, funcional y expira automáticamente después de 10 minutos. Es la herramienta perfecta para proteger tu privacidad en línea: úsala para registrarte en sitios web, probar aplicaciones, recibir códigos de verificación o cualquier situación en la que no quieras compartir tu correo personal. TmpMail no almacena datos personales, no requiere verificación de identidad y no tiene publicidad. Tu privacidad es la prioridad."
  },
  "howItWorks": {
    "title": "Cómo funciona",
    "step1": "Abre TmpMail — se genera automáticamente una dirección de correo temporal única para ti.",
    "step2": "Copia la dirección y úsala donde la necesites: formularios, registros, verificaciones.",
    "step3": "Recibe los emails en tiempo real directamente en la bandeja de TmpMail.",
    "step4": "La dirección expira en 10 minutos. Puedes generar una nueva en cualquier momento.",
    "step5": "Sin spam. Sin rastreo. Sin datos guardados."
  },
  "whyUse": {
    "title": "Por qué usar un correo temporal",
    "reason1": "Protege tu correo principal del spam y las listas de marketing.",
    "reason2": "Regístrate en sitios web sin revelar tu identidad real.",
    "reason3": "Prueba servicios y aplicaciones de forma segura.",
    "reason4": "Recibe códigos de verificación sin comprometer tu privacidad.",
    "reason5": "Evita el seguimiento entre sitios basado en tu email.",
    "reason6": "Cero configuración: no necesitas crear una cuenta ni recordar contraseñas."
  }
}
```

**Copy EN (~500 palabras):**

```json
{
  "about": {
    "title": "What is TmpMail?",
    "body": "TmpMail is a temporary, disposable email service that lets you create an email address in seconds — no registration, no password required. Each generated address is unique, fully functional, and automatically expires after 10 minutes. It's the perfect tool for protecting your online privacy: use it to sign up for websites, test applications, receive verification codes, or any situation where you don't want to share your real email. TmpMail stores no personal data, requires no identity verification, and shows no ads. Your privacy is the priority."
  },
  "howItWorks": {
    "title": "How it works",
    "step1": "Open TmpMail — a unique temporary email address is instantly generated for you.",
    "step2": "Copy the address and use it wherever you need: forms, sign-ups, verifications.",
    "step3": "Receive emails in real time directly in TmpMail's inbox.",
    "step4": "The address expires in 10 minutes. Generate a new one at any time.",
    "step5": "No spam. No tracking. No data stored."
  },
  "whyUse": {
    "title": "Why use a temporary email",
    "reason1": "Protect your primary inbox from spam and marketing lists.",
    "reason2": "Sign up for websites without revealing your real identity.",
    "reason3": "Test services and applications safely.",
    "reason4": "Receive verification codes without compromising your privacy.",
    "reason5": "Avoid cross-site tracking based on your email address.",
    "reason6": "Zero setup: no account to create, no password to remember."
  }
}
```

**Archivos:** `app/[locale]/page.tsx`, `messages/es.json`, `messages/en.json`

---

### 1.5 — Configuración Cloudflare CDN (Spec 1.1)

**Tipo:** Infraestructura (instrucciones manuales)
**Impacto:** TTFB 695ms → <100ms para usuarios fuera de Brasil.

**Pasos:**
1. Crear cuenta en Cloudflare (tier gratuito suficiente).
2. Añadir dominio `tmpmailio.com` y delegar nameservers.
3. Configurar registro A → IP del servidor (`187.77.234.184`).
4. SSL/TLS → modo **Full (strict)**.
5. Cache Rules → `tmpmailio.com/*` con `Cache Level: Cache Everything`, respetar `Cache-Control` de Next.js.
6. Speed → Compression → habilitar Brotli.

**Verificación:** `curl -I https://tmpmailio.com/es | grep -i "cf-ray\|x-nextjs-cache"`

Se genera archivo `docs/infra/cloudflare-setup.md` con instrucciones detalladas.

---

### 1.6 — Security headers en nginx (Spec 2.1)

**Tipo:** Infraestructura (archivo de config nginx)

**Headers a añadir:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy-Report-Only "default-src 'self'; ..." always;
server_tokens off;
```

**Nota:** CSP en modo Report-Only inicialmente. Después de validar 2 semanas sin errores, cambiar a enforced y submitir a https://hstspreload.org.

Se genera archivo `docs/infra/nginx-security.conf` listo para incluir.

---

## Fase 2 — Cambios ALTA prioridad

**Rama:** `feat/seo-phase-2-high`
**Depende de:** Fase 1 mergeada y deployada.
**Objetivo:** Eliminar Framer Motion completo, optimizar bundle, mejorar schema y accesibilidad móvil.

### 2.1 — Eliminar Framer Motion completamente (Spec 13.1)

Fase 1 ya eliminó las instancias del hero. Fase 2 completa la migración:

- Identificar todos los usos restantes de `motion.*` en el codebase.
- Reemplazar con CSS animations o transiciones nativas.
- `npm uninstall framer-motion` una vez sin ningún import.
- Ahorro: **172 KB** del bundle JS.

**Archivos:** Todos los componentes que importen `framer-motion`.

---

### 2.2 — Optimizar imports de Lucide React (Spec 13.2)

**Solución:** Una línea en `next.config.js`:

```js
experimental: {
  optimizePackageImports: ['lucide-react'],
}
```

No requiere cambios en componentes. Next.js realiza tree-shaking automático.
**Ahorro estimado:** ~175 KB del bundle JS.

---

### 2.3 — Cambiar redirect raíz a 308 permanente (Spec 4.1)

**Problema:** `https://tmpmailio.com/` → `/es` vía 307 temporal basado en cookie `NEXT_LOCALE`. Google no transfiere link equity con 307.

**Solución en middleware.ts:**
```ts
// Redirigir siempre a /en como x-default, sin depender de cookie
if (pathname === '/') {
  return NextResponse.redirect(new URL('/en', req.url), 308);
}
```

**Archivos:** `middleware.ts`
**Verificación:** `curl -I https://tmpmailio.com/ | grep -i "location\|status"`

---

### 2.4 — Ajustar skeleton del email (Spec 3.2)

Medir la altura exacta del componente de dirección email renderizado y ajustar el skeleton para que coincida exactamente (padding, font-size, line-height). Previene CLS en hidratación.

**Archivos:** `app/[locale]/page.tsx` (líneas ~283-286)

---

### 2.5 — Aumentar tamaños de fuente mínimos (Spec 12.1)

- Cambiar `font-size: 13px` en body → `14px` en `globals.css`.
- Cambiar todas las clases `text-[10px]` → `text-xs` (12px) en componentes.
- Cambiar `text-[11px]` → `text-xs` en botones.

**Archivos:** `app/globals.css` + componentes afectados.

---

### 2.6 — Touch targets mínimo 44px (Spec 12.2)

Revisar `.btn-flat` y otros botones de acción. Asegurar `min-height: 44px` y padding mínimo `10px 16px` para cumplir con las guías de accesibilidad móvil de Google.

**Archivos:** `app/globals.css`

---

### 2.7 — Reescribir WebApplication schema (Spec 9.2)

**Problemas actuales:**
- `url` apunta a `https://tmpmailio.com` en lugar de la URL con locale.
- `description` y `featureList` en inglés en la página en español.
- Faltan: `@id`, `isAccessibleForFree`, `image`, `publisher`.

**Schema corregido:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "@id": "https://tmpmailio.com/${locale}/#webapp",
  "name": "TmpMail",
  "url": "https://tmpmailio.com/${locale}",
  "description": "${t('schema.description')}",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "All",
  "isAccessibleForFree": true,
  "inLanguage": "${locale}",
  "featureList": "${t('schema.featureList')}",
  "image": "https://tmpmailio.com/og-image.png",
  "publisher": {
    "@type": "Organization",
    "name": "TmpMail",
    "url": "https://tmpmailio.com"
  }
}
```

**Archivos:** `app/[locale]/page.tsx`

---

### 2.8 — Añadir schemas WebSite + Organization (Spec 9.3)

Añadir dos bloques JSON-LD al layout raíz (independiente del locale):

**WebSite:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://tmpmailio.com/#website",
  "name": "TmpMail",
  "url": "https://tmpmailio.com",
  "inLanguage": ["es", "en"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://tmpmailio.com/{locale}",
    "query-input": "required name=locale"
  }
}
```

**Organization** (mejorar el existente):
- Añadir `logo` (512x512 PNG), `contactPoint`, `sameAs` (redes sociales si existen).

**Archivos:** `app/[locale]/layout.tsx`

---

### 2.9 — FAQ con `<details>/<summary>` HTML nativo (Spec 10.2)

**Problema:** Las respuestas del FAQ están en un accordion JS colapsado — no son texto visible en el primer render, Google puede no indexarlas.

**Solución:** Reemplazar el accordion con elementos HTML nativos:
```html
<details>
  <summary>¿Cuánto tiempo dura el correo temporal?</summary>
  <p>Tu dirección de correo temporal dura 10 minutos...</p>
</details>
```

**Beneficios:** Sin JS necesario, accesible por defecto, Google indexa el contenido.
**Archivos:** Componente FAQ (`components/FAQ/` o similar).

---

### 2.10 — HTTP/2 en nginx (Spec 1.2)

```nginx
listen 443 ssl http2;
```

Se actualiza `docs/infra/nginx-security.conf`.

---

### 2.11 — Auditoría Socket.IO (Spec 13.3)

Leer el código de uso de Socket.IO en el codebase e identificar:
- Qué features específicas de Socket.IO se usan (rooms, namespaces, auto-reconnect, etc.)
- Si la comunicación es unidireccional o bidireccional
- Complejidad estimada de migración a WebSocket nativo

Entregar documento `docs/infra/socketio-audit.md` con:
- Lista de archivos usando Socket.IO
- Features usadas
- Recomendación: migrar / mantener / migrar en Fase 4

---

## Fase 3 — Cambios MEDIA / BAJA prioridad

**Rama:** `feat/seo-phase-3-medium-low`
**Depende de:** Fase 2 mergeada.
**Objetivo:** Pulir internacionalización, contenido largo, schema avanzado y accesibilidad.

### Items

| # | Spec | Descripción | Archivo(s) |
|---|------|-------------|------------|
| 3.1 | 5.1 | Añadir `x-default` hreflang en `<head>` | `layout.tsx` |
| 3.2 | 5.3 | Añadir `<LocaleSwitcher>` en header | `layout.tsx` + componente |
| 3.3 | 6.1 | Sitemap: x-default + subpáginas (privacy, terms) | `sitemap.ts` |
| 3.4 | 7.1 | Separar bloques User-Agent en robots.txt + directiva `Sitemap:` | `public/robots.txt` |
| 3.5 | 4.2 | Redirects `/privacy` y `/terms` de 307 → 301 | `next.config.js` |
| 3.6 | 9.4 | BreadcrumbList JSON-LD en homepage y subpáginas | `page.tsx`, subpáginas |
| 3.7 | 10.3 | Contador de emails generados (placeholder o query real) | `page.tsx` |
| 3.8 | 10.4 | Crear página `/[locale]/about` con copy ES + EN | `[locale]/about/page.tsx` |
| 3.9 | 11.1 | Meta title: expandir a 50-60 chars | `messages/*.json` |
| 3.10 | 11.2 | Meta description: extender a 130-155 chars | `messages/*.json` |
| 3.11 | 11.3 | H1 semánticamente descriptivo con keyword principal | `page.tsx` |
| 3.12 | 11.4 | `og:locale` y `og:locale:alternate` en metadata | `layout.tsx` |
| 3.13 | 12.3 | `aria-label` en botón de refresh + `aria-hidden` en icon | `page.tsx` |
| 3.14 | 12.4 | Investigar y resolver error 500 del service worker | `public/`, `next.config.js` |
| 3.15 | 5.2 | Verificar output final `hreflang` (React prop → HTML attr) | verificación |

### Meta titles propuestos

**ES:** "TmpMail — Correo Temporal Gratis y Desechable | Sin Registro" (59 chars)
**EN:** "TmpMail — Free Disposable Temporary Email | No Registration" (57 chars)

### Meta descriptions propuestas

**ES:** "Crea tu correo desechable gratis en segundos. Sin registro, sin spam, sin datos guardados. Tu email temporal expira en 10 minutos y protege tu privacidad." (154 chars)
**EN:** "Create your free disposable email in seconds. No sign-up, no spam, no data stored. Your temporary address expires in 10 minutes and protects your privacy." (153 chars)

### Página /about — Copy ES

```md
## Sobre TmpMail

TmpMail es un servicio de correo electrónico temporal gratuito, creado para proteger la privacidad de las personas en línea.

**¿Quiénes somos?** Un equipo independiente enfocado en herramientas de privacidad digital accesibles para todos.

**Contacto:** contacto@tmpmailio.com

**Privacidad:** No almacenamos datos personales. Las direcciones de correo y los mensajes recibidos se eliminan automáticamente al expirar. Consulta nuestra [política de privacidad](/es/privacy) para más detalles.
```

### Página /about — Copy EN

```md
## About TmpMail

TmpMail is a free temporary email service, built to protect people's privacy online.

**Who we are:** An independent team focused on making digital privacy tools accessible to everyone.

**Contact:** contacto@tmpmailio.com

**Privacy:** We don't store personal data. Email addresses and received messages are automatically deleted upon expiry. Read our [privacy policy](/en/privacy) for full details.
```

---

## Estructura de archivos afectados

### Crear
- `docs/infra/cloudflare-setup.md`
- `docs/infra/nginx-security.conf`
- `docs/infra/socketio-audit.md`
- `app/apps/frontend/app/[locale]/about/page.tsx`

### Modificar
- `app/apps/frontend/app/[locale]/layout.tsx`
- `app/apps/frontend/app/[locale]/page.tsx`
- `app/apps/frontend/app/[locale]/privacy/page.tsx`
- `app/apps/frontend/app/[locale]/terms/page.tsx`
- `app/apps/frontend/app/globals.css`
- `app/apps/frontend/app/sitemap.ts`
- `app/apps/frontend/middleware.ts`
- `app/apps/frontend/next.config.js`
- `app/apps/frontend/public/robots.txt`
- `app/apps/frontend/messages/en.json`
- `app/apps/frontend/messages/es.json`
- Componente FAQ
- Componentes que usen `framer-motion` o `lucide-react`

---

## Métricas de éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| LCP | >2.5s (estimado) | <1.5s |
| TTFB con CDN | 695ms | <100ms |
| Bundle JS | ~478 KB base | ~131 KB (-347 KB) |
| Palabras indexables | ~99 | >500 |
| Canonicals correctos | 2/6 páginas | 6/6 páginas |
| Security headers | 0 | 6 |
| Schema válido | Parcial | Completo |

---

## Verificaciones post-deploy por fase

### Fase 1
```bash
# LCP no bloqueado
curl -s https://tmpmailio.com/es | grep -i "opacity"
# Canonical correcto en subpáginas
curl -s https://tmpmailio.com/es/privacy | grep -i "canonical"
# FAQPage eliminado
curl -s https://tmpmailio.com/es | grep -i "FAQPage"
# CDN activo
curl -I https://tmpmailio.com/es | grep -i "cf-ray"
# Security headers
curl -I https://tmpmailio.com/es | grep -iE "strict-transport|x-frame|x-content-type"
```

### Fase 2
```bash
# Framer Motion eliminado del bundle
# (verificar con next build output y bundle analyzer)
# Redirect 308
curl -I https://tmpmailio.com/ | grep -i "location\|301\|308"
# Schema WebApplication correcto
curl -s https://tmpmailio.com/es | python3 -m json.tool | grep -i "tmpmailio.com/es"
```

### Fase 3
```bash
# x-default hreflang
curl -s https://tmpmailio.com/es | grep -i "x-default"
# Sitemap subpáginas
curl https://tmpmailio.com/sitemap.xml | grep privacy
# robots.txt formato
curl https://tmpmailio.com/robots.txt
```
