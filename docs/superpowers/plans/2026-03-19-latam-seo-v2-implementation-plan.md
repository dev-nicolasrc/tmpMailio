# Plan de Implementación — LATAM Use-Case Pages + SEO v2

**Fecha:** 2026-03-19
**Specs de referencia:**
- `docs/superpowers/specs/2026-03-19-latam-use-case-pages-design.md`
- `docs/tmpmailio-seo-spec-v2.md`

**Objetivo SEO:** 68/100 → 82+/100
**Directorio de trabajo:** `apps/frontend/`

---

## Fase 1 — CRÍTICA (hacer primero, mayor impacto)

### Paso 1 — Accesibilidad: contraste en modo claro `[seo-v2 §10.1]`

**Archivo:** `app/globals.css`

El acento `#5C8000` sobre fondos claros no cumple WCAG AA (ratio < 4.5:1). Ajustar a un verde más oscuro (~`#4A6800`) que pase el contraste y mantener el look.

- Editar `.light { --accent-primary }` y `--accent-secondary` en `globals.css`
- Verificar con https://webaim.org/resources/contrastchecker/ que texto sobre `--bg-secondary` (#FAFAF7) pase 4.5:1

---

### Paso 2 — Política de Privacidad expandida `[seo-v2 §8.2]`

**Archivos:** `app/[locale]/privacy/page.tsx`, `messages/es.json`, `messages/en.json`

La política actual es demasiado corta para GDPR/LOPDGDD. Expandir con:

- Responsable del tratamiento (nombre del servicio, email de contacto)
- Marco legal aplicable (RGPD, LOPDGDD para ES; GDPR para EN)
- Datos que NO recopilamos (sin cookies de rastreo, sin IP almacenada)
- Datos que SÍ procesamos temporalmente (contenido de emails, dirección temporal)
- Cookies (solo funcionales, sin analytics)
- Derechos del usuario (acceso, rectificación, supresión, portabilidad)
- Transferencias internacionales (servidores en UE o información al respecto)
- Modificaciones (versionado + fecha)

Añadir el contenido expandido en `messages/es.json` y `messages/en.json` bajo la clave `legal.privacy` y actualizar `privacy/page.tsx` para renderizarlo.

---

### Paso 3 — FAQPage JSON-LD `[seo-v2 §6.1]`

**Archivos:** `lib/schema/faq.ts` (nuevo), `app/[locale]/page.tsx`

Aunque los rich results de FAQPage están restringidos en SERPs, este schema es la señal más directa para AI Overviews, ChatGPT y Perplexity.

1. Crear `lib/schema/faq.ts` con `buildFaqSchema(locale)` que retorna el objeto JSON-LD
2. El contenido ya existe en el HTML (FAQ accordion) — solo estructurarlo en schema
3. En `app/[locale]/page.tsx` (que es `"use client"`), añadir el `<script type="application/ld+json">` con el schema generado server-side. **Nota:** como `page.tsx` es cliente, el schema debe generarse en el layout o en un server component wrapper. La solución más limpia: añadirlo en `app/[locale]/layout.tsx` (server component) leyendo el locale del params.

---

## Fase 2 — ALTA (páginas de uso + fixes técnicos clave)

### Paso 4 — `lib/use-cases.ts` `[LATAM spec]`

**Archivo:** `lib/use-cases.ts` (nuevo)

```ts
export const SLUG_PAIRS = [
  { es: "correo-temporal-para-registros-web",  en: "temporary-email-for-web-signups" },
  { es: "email-desechable-sin-registro",        en: "disposable-email-no-registration" },
  { es: "proteger-privacidad-email",            en: "protect-email-privacy" },
  { es: "correo-temporal-redes-sociales",       en: "temporary-email-social-media" },
  { es: "evitar-spam-correo-personal",          en: "avoid-email-spam" },
] as const

export function getAlternateSlug(slug: string, locale: "es" | "en"): string | null { ... }
export function getSlugLocale(slug: string): "es" | "en" | null { ... }
```

---

### Paso 5 — Extraer `MailboxWidget` `[LATAM spec]`

**Archivos:** `components/Mailbox/MailboxWidget.tsx` (nuevo), `app/[locale]/page.tsx` (modificar)

1. Crear `components/Mailbox/MailboxWidget.tsx` con `"use client"` al inicio
2. Mover a este archivo desde `app/[locale]/page.tsx`:
   - `useTypewriter` helper function
   - `useMailbox()`, `useSocket()`, `useClipboard()` hooks
   - `isMobile` state + resize listener
   - `showDomainPicker` state + `DomainDropdown`
   - Address box JSX completo (con typewriter, cursor, botones de acción)
   - `ExpirationTimer` con onExpired
   - Loading skeleton (`h-[60px]`)
   - `QRModal` + `Toast`
3. En `app/[locale]/page.tsx` reemplazar el bloque del widget por `<MailboxWidget />`
4. `page.tsx` sigue siendo `"use client"` — no cambia su naturaleza

---

### Paso 6 — Contenido use-case en messages JSON `[LATAM spec]`

**Archivos:** `messages/es.json`, `messages/en.json`

Añadir clave `useCases` con los 5 slugs ES en `es.json` y los 5 slugs EN en `en.json`.

Estructura por slug (~600 palabras totales por página):
```json
"useCases": {
  "correo-temporal-para-registros-web": {
    "title": "Correo Temporal para Registros Web — Sin Spam",
    "description": "Crea un correo temporal gratis para registros en webs. Sin spam en tu email real. Expira en 10 minutos automáticamente.",
    "intro": "...",
    "howTitle": "Cómo usar TmpMail para registros web",
    "steps": ["...", "...", "..."],
    "whyTitle": "Por qué TmpMail es la mejor opción",
    "whyItems": ["...", "...", "...", "..."],
    "faq": [{ "q": "...", "a": "..." }, { "q": "...", "a": "..." }]
  },
  "email-desechable-sin-registro": { ... },
  "proteger-privacidad-email": { ... },
  "correo-temporal-redes-sociales": { ... },
  "evitar-spam-correo-personal": { ... }
}
```

**Contenido sugerido para ES (expandir en implementación):**

| Slug | H1 | Keyword objetivo |
|------|----|-----------------|
| `correo-temporal-para-registros-web` | Correo Temporal para Registros Web — Gratis y Sin Spam | correo temporal para registros |
| `email-desechable-sin-registro` | Email Desechable Sin Registro — Listo en Segundos | email desechable sin registro |
| `proteger-privacidad-email` | Protege tu Privacidad con un Correo Temporal | proteger privacidad email |
| `correo-temporal-redes-sociales` | Correo Temporal para Redes Sociales — Sin Datos Reales | correo temporal redes sociales |
| `evitar-spam-correo-personal` | Cómo Evitar Spam en tu Correo con un Email Temporal | evitar spam correo personal |

---

### Paso 7 — `app/[locale]/[slug]/page.tsx` `[LATAM spec]`

**Archivo:** `app/[locale]/[slug]/page.tsx` (nuevo)

Server component async. Implementar en orden:

1. `export const dynamicParams = false`
2. `generateStaticParams` — retorna 10 pares `{ locale, slug }` desde `SLUG_PAIRS`
3. `generateMetadata` — `setRequestLocale` → guard slug → `getTranslations({ namespace: "useCases" })` → retornar title, description, canonical, hreflang, openGraph (con imagen), twitter card
4. Page component:
   - `setRequestLocale(locale)`
   - Guard: `getSlugLocale(slug)` → `notFound()` si null o locale mismatch
   - `getTranslations({ locale, namespace: "useCases" })`
   - JSX: header (con link directo al slug alterno), hero (H1 + intro), `<MailboxWidget />`, how-to, why, faq, footer
   - BreadcrumbList JSON-LD con `@context`

**Header del use-case page:** No usa `<LocaleSwitcher />` (rompería la URL). En su lugar, un `<Link href={`/${altLocale}/${altSlug}`}>` directo.

---

### Paso 8 — Redirect raíz 302 → 301 `[seo-v2 §3.1]`

**Archivo:** `middleware.ts`

Cambiar el redirect de `/` de `302` a `301`. **Nota:** El middleware actual usa `detectLocale` para redirigir al idioma del usuario — esto es 302 por diseño (el idioma puede cambiar). Sin embargo, la raíz `/` puede hacer 301 si se elige un default fijo (`/en`). Discutir con el usuario si se acepta perder la detección de idioma en el redirect raíz a cambio del beneficio SEO de 301.

**Decisión de implementación:** Si se mantiene la detección → 302 es correcto. Si se prioriza SEO → 301 a `/en` siempre.

---

### Paso 9 — Sitemap expandido `[seo-v2 §5.1]`

**Archivo:** `app/sitemap.ts`

Añadir `/about` y `/contact` al sitemap para ambos locales. También añadir las 10 URLs de use-case pages una vez estén en producción. Total: 14 URLs (5 páginas base × 2 locales + 10 use-case).

```ts
// Páginas base: home, privacy, terms, contact, about (×2 locales = 10)
// Use-case pages: 5 ES + 5 EN = 10
// Total: 20 URLs en sitemap
```

Usar `lastModified` con fechas fijas (`'2026-03-19'`), no `new Date()`.

---

### Paso 10 — `og:url` en páginas internas `[seo-v2 §7.1]`

**Archivos:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/contact/page.tsx`, `app/[locale]/about/page.tsx`

Verificar que `generateMetadata` en cada subpágina incluye `openGraph.url` con la URL correcta de la página (no hereda la del layout). El bug de herencia de metadata en Next.js hace que `og:url` tome el valor del layout si no se define explícitamente.

---

### Paso 11 — Trust badge renderizado en SSR `[seo-v2 §8.1]`

**Archivo:** `app/[locale]/page.tsx` o `MailboxWidget.tsx`

El badge "Sin publicidad · Sin rastreo · Código abierto" debe estar en el HTML del servidor (no solo en client-side JS). Si actualmente se renderiza con condición client-side, moverlo al JSX estático.

---

### Paso 12 — Tap targets y line-height `[seo-v2 §10.2, §10.3]`

**Archivos:** `globals.css`, `components/Footer/Footer.tsx`, `components/ui/LocaleSwitcher.tsx`

- `10.2` — H1 hero: añadir `line-height: 1.1` o `leading-tight` explícito (WCAG SC 1.4.12 requiere poder aumentar line-height hasta 1.5× sin perder contenido)
- `10.3` — Links del footer: asegurar `min-height: 44px` y `min-width: 44px` para tap targets. Links de navegación en mobile deben tener padding suficiente.

---

### Paso 13 — BreadcrumbList en páginas internas `[seo-v2 §6.4]`

**Archivos:** `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/contact/page.tsx`

Añadir BreadcrumbList JSON-LD con `@context` en las páginas que aún no lo tienen. `about/page.tsx` ya lo tiene — verificar que incluye `@context`.

---

### Paso 14 — About, Terms, Contact expandidos `[seo-v2 §8.3]`

**Archivos:** páginas correspondientes + messages JSON

Ampliar el contenido de estas páginas a ~350 palabras mínimo para E-E-A-T:
- **About:** añadir "Por qué creamos TmpMail", "Cómo funciona técnicamente" (sin exponer secretos), "Nuestro compromiso con la privacidad", año de fundación ("disponible desde 2024")
- **Terms:** estructura completa con 8 secciones (aceptación, descripción, uso aceptable, limitación de responsabilidad, propiedad intelectual, modificaciones, ley aplicable, contacto)
- **Contact:** formulario o instrucciones claras de contacto, tiempo de respuesta estimado

---

## Fase 3 — MEDIA

### Paso 15 — robots.txt `[seo-v2 §2.1]`

**Acción manual + código:** Resolver conflicto GPTBot/ClaudeBot entre Cloudflare Managed y el operador. Si `app/robots.ts` existe, asegurar que las reglas son las correctas y que Cloudflare no añade un bloque contradictorio. Verificar en panel Cloudflare → Security → Bots.

---

### Paso 16 — HowTo JSON-LD `[seo-v2 §6.2]`

**Archivos:** `lib/schema/howto.ts` (nuevo), `app/[locale]/layout.tsx`

Crear `buildHowToSchema(locale)` con los 5 pasos de "Cómo funciona". Añadir al layout para que aparezca en todas las páginas del locale, o solo en `page.tsx` (homepage).

---

### Paso 17 — Corregir WebApplication schema `[seo-v2 §6.3]`

**Archivo:** `app/[locale]/page.tsx`

- `applicationCategory`: `"UtilitiesApplication"` → `"Utilities"`
- `operatingSystem`: `"All"` → `"Any web browser"`
- `featureList`: de array a string separado por comas (o eliminar — no es campo reconocido por Google)

---

### Paso 18 — hreflang x-default estandarizado `[seo-v2 §4.1]`

**Archivos:** `middleware.ts` o `app/[locale]/layout.tsx`

Verificar que las tres fuentes de hreflang (HTTP Link header, HTML meta, sitemap) apuntan `x-default` a `/en`, no a la raíz `/`. La raíz hace 302 → inconsistencia.

---

### Paso 19 — Eliminar "correo fake" de keywords `[seo-v2 §7.2]`

**Archivo:** `app/[locale]/layout.tsx`

"correo fake" tiene connotación negativa y puede asociar el dominio con spam. Reemplazar por "correo anónimo" o "email privado temporal".

---

### Paso 20 — FAQ primer elemento abierto `[seo-v2 §10.4]`

**Archivo:** `components/FAQ/FAQAccordion.tsx`

Añadir `open` al primer `<details>` para que Google vea el contenido del primer FAQ sin necesidad de interacción.

---

### Paso 21 — apple-touch-icon HTTP 500 `[seo-v2 §11.1]`

**Archivo:** `public/apple-touch-icon.png` o route handler

Verificar que `/apple-touch-icon.png` retorna 200. Si da 500, crear el archivo en `public/` con el tamaño correcto (180×180px).

---

### Paso 22 — Preconnect correcto `[seo-v2 §9.2]`

**Archivo:** `app/[locale]/layout.tsx`

El preconnect actual apunta a `NEXT_PUBLIC_SOCKET_URL`. Verificar que este es el dominio correcto y que el DNS prefetch también está. Si hay preconnect redundante a dominios no usados, eliminarlo.

---

## Fase 4 — BAJA

### Paso 23 — `og:image:alt` en ES `[seo-v2 §7.3]`

**Archivo:** `app/[locale]/layout.tsx`

Añadir `alt` al objeto de imagen en `openGraph.images` para el locale ES.

---

### Paso 24 — Elemento `<time>` en footer `[seo-v2 §7.4]`

**Archivo:** `components/Footer/Footer.tsx`

Envolver el año `© {new Date().getFullYear()}` en `<time dateTime="2026">` para semántica correcta.

---

### Paso 25 — Estandarizar nombre de marca `[seo-v2 §8.5]`

Decidir entre "TmpMail" y "TmpMailio" y usar uno consistentemente en toda la UI, schemas y meta tags.

---

## Orden de implementación sugerido por sesión

| Sesión | Pasos | Resultado |
|--------|-------|-----------|
| **Sesión 1** | 1, 2, 3 | Críticos resueltos (contraste, privacidad, FAQ schema) |
| **Sesión 2** | 4, 5, 6 | MailboxWidget extraído + contenido JSON listo |
| **Sesión 3** | 7 | 10 URLs de use-case pages funcionando |
| **Sesión 4** | 8, 9, 10, 11, 12, 13 | Fixes técnicos SEO ALTA |
| **Sesión 5** | 14, 15, 16, 17, 18, 19 | E-E-A-T + schema completado |
| **Sesión 6** | 20, 21, 22, 23, 24, 25 | MEDIA/BAJA + pulido |

---

## Verificación final

Después de implementar Fase 1+2:
```bash
# Build sin errores
cd apps/frontend && npm run build

# 10 use-case URLs marcadas como ○ en el output
# Verificar en https://pagespeed.web.dev/report?url=https://tmpmailio.com/es
# Verificar en https://search.google.com/test/rich-results
# Verificar en https://validator.schema.org/
```
