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

**Problema:** El `motion.div` que envuelve el widget del mailbox (dirección de email) renderiza con `opacity:0` en el HTML del servidor. Framer Motion lo anima client-side con `initial={{ opacity: 0, y: 8 }}`, introduciendo 1.5-2s de delay antes del primer paint visible — bloqueando el LCP.

**Archivo afectado:** `apps/frontend/app/[locale]/page.tsx` — buscar `motion.div` con `initial={{ opacity: 0` cerca del bloque del mailbox.

**Solución:** Reemplazar el `motion.div` del mailbox por un `<div>` regular con animación CSS usando `animation-fill-mode: both` para que el elemento pinte inmediatamente con opacidad 1 antes de que la animación empiece:

```css
/* globals.css */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out both;
  /* "both" = aplica el estado "from" antes de que empiece,
     PERO el elemento ya es visible en el SSR HTML porque no tiene
     style="opacity:0" inline — solo se anima cuando JS hidrata */
}
```

**Nota importante:** El CSS anterior funciona para la animación post-hidratación. El fix del LCP está en **eliminar el `style="opacity:0"` que Framer Motion inyecta en el SSR** — cosa que sucede automáticamente al reemplazar `motion.div` por `div`. El elemento en el HTML estático tendrá `opacity:1` por defecto.

```tsx
/* page.tsx — antes */
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

/* page.tsx — después */
<div className="animate-fade-in-up">
```

**Archivos:** `apps/frontend/app/[locale]/page.tsx`, `apps/frontend/app/globals.css`
**Verificación:** `curl -s https://tmpmailio.com/es | grep -i "opacity:0"` → debe retornar vacío.

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

**Copy ES (~320 palabras visibles en homepage con Fase 1; ~500+ al añadir FAQ en Fase 2):**

```json
{
  "about": {
    "title": "¿Qué es TmpMail?",
    "body": "TmpMail es un servicio de correo electrónico temporal y desechable que te permite crear una dirección de email en segundos, sin registro y sin contraseña. Cada dirección generada es única, completamente funcional y expira automáticamente después de 10 minutos. Es la herramienta perfecta para proteger tu privacidad en línea: úsala para registrarte en sitios web que no conoces, probar aplicaciones, recibir códigos de verificación SMS o cualquier situación en la que no quieras compartir tu correo personal. A diferencia de los servicios de email tradicionales, TmpMail no almacena datos personales, no requiere verificación de identidad, no tiene publicidad y no vende tus datos a terceros. Cuando la dirección expira, todos los mensajes se eliminan permanentemente. Tu privacidad es la prioridad.",
    "note": "~100 palabras"
  },
  "howItWorks": {
    "title": "Cómo funciona TmpMail",
    "intro": "Usar un correo temporal nunca fue tan sencillo. No necesitas instalar ninguna aplicación ni crear una cuenta.",
    "step1": "Abre TmpMail — se genera automáticamente una dirección de correo temporal única para ti. No tienes que elegir nada.",
    "step2": "Copia la dirección con un clic y úsala donde la necesites: formularios de registro, newsletters, verificaciones de cuenta, sorteos o cualquier servicio que pida un email.",
    "step3": "Recibe los emails en tiempo real directamente en la bandeja de entrada de TmpMail. Los mensajes aparecen en segundos.",
    "step4": "Lee el contenido del email, copia el código de verificación o el enlace que necesitas. No hace falta hacer nada más.",
    "step5": "La dirección y todos los mensajes expiran automáticamente en 10 minutos. Puedes generar una dirección nueva en cualquier momento con un clic.",
    "note": "~110 palabras"
  },
  "whyUse": {
    "title": "Por qué usar un correo temporal desechable",
    "intro": "El email es la puerta de entrada al spam, el rastreo y las brechas de privacidad. Un correo temporal cierra esa puerta.",
    "reason1": "Protege tu bandeja de entrada principal del spam y las listas de marketing no deseadas.",
    "reason2": "Regístrate en sitios web y aplicaciones sin revelar tu identidad real ni tu email personal.",
    "reason3": "Prueba servicios de pago, demos y trials sin comprometer tu cuenta principal.",
    "reason4": "Recibe códigos de verificación de un solo uso sin que el sitio guarde tu email.",
    "reason5": "Evita el rastreo entre sitios que usan el email como identificador único.",
    "reason6": "Cero configuración y cero datos guardados: no hay cuenta que hackear ni contraseña que recordar.",
    "note": "~110 palabras"
  }
}
```

**Total aproximado en homepage:** ~320 palabras. El FAQ con `<details>/<summary>` (Fase 2, item 2.9) añade ~150-200 palabras adicionales indexables, alcanzando las 500+ palabras objetivo al completar Fase 2.

**Copy EN (~315 visible words in homepage with Phase 1; ~500+ after adding FAQ in Phase 2):**

```json
{
  "about": {
    "title": "What is TmpMail?",
    "body": "TmpMail is a free temporary, disposable email service that lets you create an email address in seconds — no registration, no password required. Each generated address is unique, fully functional, and automatically expires after 10 minutes. It's the perfect tool for protecting your online privacy: use it to sign up for websites you don't fully trust, test applications, receive one-time verification codes, or any situation where you don't want to share your real email. Unlike traditional email providers, TmpMail stores no personal data, requires no identity verification, shows no ads, and never sells your information to third parties. When the address expires, all messages are permanently deleted. Your privacy is the priority.",
    "note": "~105 words"
  },
  "howItWorks": {
    "title": "How TmpMail works",
    "intro": "Using a temporary email has never been simpler. No app to install, no account to create.",
    "step1": "Open TmpMail — a unique temporary email address is instantly generated for you. No choices required.",
    "step2": "Copy the address with one click and use it anywhere you need: sign-up forms, newsletters, account verifications, giveaways, or any service that asks for an email.",
    "step3": "Receive emails in real time directly in TmpMail's inbox. Messages appear within seconds.",
    "step4": "Read the email, copy the verification code or link you need. Nothing else to do.",
    "step5": "The address and all messages expire automatically after 10 minutes. Generate a new one at any time with a single click.",
    "note": "~110 words"
  },
  "whyUse": {
    "title": "Why use a disposable temporary email",
    "intro": "Your email address is the gateway to spam, tracking, and privacy breaches. A temporary email closes that door.",
    "reason1": "Keep your main inbox free from spam and unwanted marketing emails.",
    "reason2": "Sign up for websites and apps without revealing your real identity or personal email.",
    "reason3": "Test paid services, demos, and trials without exposing your primary account.",
    "reason4": "Receive one-time verification codes without the site storing your email permanently.",
    "reason5": "Avoid cross-site tracking that uses your email as a unique identifier.",
    "reason6": "Zero setup, zero data stored: no account to hack, no password to remember.",
    "note": "~110 words"
  }
}
```

**Total aproximado en homepage:** ~325 words. The FAQ with `<details>/<summary>` (Phase 2, item 2.9) adds ~150-200 additional indexable words, reaching the 500+ word target after Phase 2 is complete.

**Archivos:** `app/[locale]/page.tsx`, `messages/es.json`, `messages/en.json`

---

### 1.5 — Verificar ISR y añadir revalidation en homepage (Spec 3.3)

**Problema:** El TTFB del origen es ~695-858ms. Si el ISR (Incremental Static Regeneration) no está configurado en la homepage, cada visita regenera el HTML en el servidor.

**Solución:**
1. Verificar que el header `x-nextjs-cache: HIT` llega en respuestas subsiguientes: `curl -I https://tmpmailio.com/es | grep x-nextjs-cache`
2. Si no hay cache HIT, añadir en la homepage:
   ```ts
   // apps/frontend/app/[locale]/page.tsx
   export const revalidate = 3600; // revalidar cada hora
   ```
3. Si el origen sigue lento con ISR activo, evaluar migrar el servidor de Brasil a Europa (la audiencia objetivo es hispanohablante global, no solo Brasil).

**Archivos:** `apps/frontend/app/[locale]/page.tsx`

---

### 1.6 — Configuración Cloudflare CDN (Spec 1.1)

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

### 1.7 — Security headers en nginx (Spec 2.1)

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

Fase 1 ya eliminó el `motion.div` del mailbox. Fase 2 completa la migración eliminando los usos restantes conocidos:

**Archivos con imports de `framer-motion` a migrar:**
- `apps/frontend/components/FAQ/FAQAccordion.tsx` — usa `motion` y `AnimatePresence` para la animación de apertura/cierre del accordion. Como el item 2.9 reemplaza el accordion con `<details>/<summary>`, este archivo queda sin usos de Framer Motion.
- `apps/frontend/components/ui/QRModal.tsx` — usa `motion` para el fade-in del modal. Reemplazar con CSS `@keyframes fadeIn` + clase `.animate-fade-in`.

**Pasos:**
1. Verificar no quedan imports: `grep -r "framer-motion" apps/frontend/`
2. Reemplazar animaciones restantes con CSS.
3. `npm uninstall framer-motion` (desde `apps/frontend/`).
4. Build y verificar que no hay errores.

**Ahorro: ~172 KB** del bundle JS.

**Archivos:** `apps/frontend/components/FAQ/FAQAccordion.tsx`, `apps/frontend/components/ui/QRModal.tsx`, `apps/frontend/package.json`.

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

### 2.3 — Cambiar redirect raíz a 301 permanente (Spec 4.1)

**Problema:** `https://tmpmailio.com/` → `/es` vía 307 temporal basado en cookie `NEXT_LOCALE`. Google no transfiere link equity con 307.

**Nota sobre el status code:** El audit recomienda 301. Se usa 301 (no 308) para máxima compatibilidad con crawlers que no siguen 308.

**Solución:** El middleware actual usa `createMiddleware` de `next-intl`, que detecta el locale desde la cookie y hace el redirect automáticamente como 307. Para convertirlo a 301 permanente sin depender de la cookie, hay que interceptar la ruta raíz **antes** de que `createMiddleware` la procese:

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({ /* config existente */ });

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Interceptar raíz ANTES de next-intl para redirect permanente
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/en', request.url), 301);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

**Archivos:** `apps/frontend/middleware.ts`
**Verificación:** `curl -I https://tmpmailio.com/ | grep -i "location\|301"`

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

**Archivos:** `apps/frontend/app/layout.tsx` (el layout raíz, fuera de la carpeta `[locale]`, para que se renderice una sola vez para todo el sitio y no se duplique en cada locale).

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
**Archivos:** `apps/frontend/components/FAQ/FAQAccordion.tsx` (mismo archivo que se migra en 2.1 al eliminar Framer Motion — ambos cambios van en el mismo commit).

---

### 2.10 — HTTP/2 en nginx (Spec 1.2)

```nginx
listen 443 ssl http2;
```

Se actualiza `docs/infra/nginx-security.conf`.

---

### 2.11 — Investigar fetchPriority="low" en webpack runtime (Spec 3.4)

**Problema:** El runtime chunk de webpack se carga con `fetchPriority="low"`, lo que puede retrasar la hidratación. La configuración `optimizePackageImports` de Lucide (2.2) puede resolver esto como efecto secundario al reducir el número de chunks.

**Acción:** Después de aplicar 2.2, verificar con DevTools Network si el webpack runtime ya no tiene `fetchPriority="low"`. Si persiste, buscar si hay una opción en `next.config.js` para controlarlo o abrir un issue en Next.js.

**Archivo:** `apps/frontend/next.config.js` (si hay fix disponible)

---

### 2.12 — Auditoría Socket.IO (Spec 13.3)

Leer el código de uso de Socket.IO en el codebase e identificar:
- Qué features específicas de Socket.IO se usan (rooms, namespaces, auto-reconnect, etc.)
- Si la comunicación es unidireccional o bidireccional
- Complejidad estimada de migración a WebSocket nativo

Entregar documento `docs/infra/socketio-audit.md` con:
- Lista de archivos usando Socket.IO
- Features usadas
- Recomendación: migrar / mantener / migrar en Fase 4

---

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
| 3.3 | 6.1 | Sitemap: x-default + subpáginas (privacy, terms) | `apps/frontend/app/sitemap.ts` |
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

**Nota de verificación (Spec 5.2):** React convierte automáticamente la prop `hrefLang` → atributo HTML `hreflang`. Next.js `alternates.languages` también genera el atributo correcto. Verificar con `curl https://tmpmailio.com/es | grep hreflang` — si el output es `hreflang="es"` en minúsculas, no hay nada que corregir.

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

Todos los paths son relativos a la raíz del repositorio (`/app/`).

### Crear
- `docs/infra/cloudflare-setup.md`
- `docs/infra/nginx-security.conf`
- `docs/infra/socketio-audit.md`
- `apps/frontend/app/[locale]/about/page.tsx`

### Modificar
- `apps/frontend/app/layout.tsx` ← schemas WebSite + Organization (raíz)
- `apps/frontend/app/[locale]/layout.tsx`
- `apps/frontend/app/[locale]/page.tsx`
- `apps/frontend/app/[locale]/privacy/page.tsx`
- `apps/frontend/app/[locale]/terms/page.tsx`
- `apps/frontend/app/globals.css`
- `apps/frontend/app/sitemap.ts`
- `apps/frontend/middleware.ts`
- `apps/frontend/next.config.js`
- `apps/frontend/public/robots.txt`
- `apps/frontend/messages/en.json`
- `apps/frontend/messages/es.json`
- `apps/frontend/components/FAQ/FAQAccordion.tsx`
- `apps/frontend/components/ui/QRModal.tsx`
- Componentes que importen `lucide-react`

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
# Redirect 301
curl -I https://tmpmailio.com/ | grep -i "location\|301"
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
