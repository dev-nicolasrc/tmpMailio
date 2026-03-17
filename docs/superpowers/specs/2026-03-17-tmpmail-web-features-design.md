# TmpMail — Web App Features v2

**Fecha:** 2026-03-17
**Estado:** Aprobado para implementación
**Proyecto:** apps/frontend (Next.js 14, TypeScript, Zustand, next-intl es/en)

---

## Contexto

TmpMail es un servicio de correo temporal en producción en `https://tmpmailio.com`. Este spec cubre 6 features pendientes agrupadas en dos oleadas de implementación: primero las de contenido/UI (sin nueva lógica de estado), luego las de comportamiento.

---

## Alcance

### Oleada 1 — Contenido / UI

| Feature | Descripción |
|---------|-------------|
| PWA Icons | Generar `icon-192.png` e `icon-512.png` desde el branding actual |
| Página 404 | `not-found.tsx` personalizada con efecto glitch |
| `/privacy` | Política de privacidad con contenido real |
| `/terms` | Términos de uso con contenido real |
| `/contact` | Formulario de contacto vía mailto |

### Oleada 2 — Comportamiento

| Feature | Descripción |
|---------|-------------|
| Toast + expiración auto-silenciosa | Al expirar el buzón, crear uno nuevo + toast breve |
| Notificaciones completas | Correos nuevos + expiración próxima (2 min) + buzón renovado |
| Selector de dominio | `@dominio ▼` clickeable en el address-box |

---

## Oleada 1 — Diseño detallado

### 1.1 PWA Icons

**Problema:** `manifest.json` referencia `/icons/icon-192.png` e `/icons/icon-512.png` que dan 404. El `theme_color` y `background_color` son incorrectos.

**Solución:** Route handlers de Next.js que sirven las imágenes con `ImageResponse` — sin archivos estáticos que mantener.

**Archivos nuevos:**
- `app/icons/icon-192.png/route.tsx` — ImageResponse 192×192
- `app/icons/icon-512.png/route.tsx` — ImageResponse 512×512

**Nota de implementación:** `ImageResponse` establece automáticamente `Content-Type: image/png`. No se requiere header manual. Para la fuente del texto `TMP`, usar `fontFamily: "monospace"` (fuente del sistema — evita la necesidad de fetchear una fuente externa, que no está disponible en route handlers sin fetch explícito).

**Diseño del icono:**
- Fondo: `#080808`
- Texto: `TMP` en `#B8FF35`, `fontFamily: "monospace"`, `fontWeight: 900`, centrado
- Borde inferior: línea de 4px `#B8FF35`

**Cambios a `public/manifest.json`:**
```json
"theme_color": "#B8FF35",
"background_color": "#080808"
```

---

### 1.2 Página 404

**Archivo:** `app/[locale]/not-found.tsx`

Next.js invoca este archivo automáticamente cuando una ruta bajo `[locale]` no existe. Es un server component async. Para obtener el locale se usa `getLocale()` de `next-intl/server`, que lee el contexto de request sin necesitar params:
```ts
import { getLocale } from "next-intl/server"
const locale = await getLocale()
```
`useLocale()` es un hook de cliente y **no** debe usarse aquí.

**Estructura:**
```
(layout.tsx ya renderiza header y footer)
  ├── span: "// error" — label sistema
  ├── h1: "404" — glitch animation
  ├── p: "Esta página no existe." / "This page does not exist."
  └── Link → `/${locale}` — "← Volver al inicio" / "← Back to home"
```

**Animación glitch:** añadir `@keyframes glitch` a `globals.css`:
```css
@keyframes glitch {
  0%, 87%, 100% {
    text-shadow: 2px 0 #FF3333, -2px 0 rgba(184,255,53,0.5);
    transform: translateX(0);
  }
  88% {
    text-shadow: -3px 0 #FF3333, 3px 0 rgba(184,255,53,0.5);
    transform: translateX(2px);
  }
  89% {
    text-shadow: 3px 0 #FF3333, -3px 0 rgba(184,255,53,0.5);
    transform: translateX(-2px);
  }
  90% {
    text-shadow: 2px 0 #FF3333, -2px 0 rgba(184,255,53,0.5);
    transform: translateX(0);
  }
}
```

Aplicar al número 404:
```css
.glitch {
  animation: glitch 4s infinite;
}
```

---

### 1.3 Páginas legales

**Archivos nuevos:**
- `app/[locale]/privacy/page.tsx`
- `app/[locale]/terms/page.tsx`
- `app/[locale]/contact/page.tsx`

Todas server components salvo el formulario de contacto (client component `ContactForm`).

**Layout compartido:** header/footer provistos por `[locale]/layout.tsx`. Cada página sigue esta estructura:
```
<article class="max-w-2xl mx-auto py-14 px-5 md:px-10">
  <header>
    <span>// namespace · label sistema</span>
    <h1>{título}</h1>
    <time>{fecha actualización}</time>
  </header>
  {secciones}
</article>
```

Cada sección:
```
<section>
  <h2>// TÍTULO SECCIÓN</h2>
  <p>{contenido}</p>
</section>
```

---

#### Privacy (`/[locale]/privacy`)

Título: **"Privacidad"** / **"Privacy"**
Fecha: Última actualización: marzo 2026 / Last updated: March 2026

**Sección 1 — Datos que NO recopilamos / Data we do NOT collect**
> ES: TmpMail no almacena direcciones IP, no requiere registro y no usa cookies de rastreo ni análisis de comportamiento. No existe ningún perfil de usuario asociado a tu uso del servicio.
> EN: TmpMail does not store IP addresses, requires no registration, and uses no tracking or analytics cookies. No user profile is created from your use of the service.

**Sección 2 — Datos que procesamos temporalmente / Data we process temporarily**
> ES: El contenido de los correos recibidos se almacena en memoria (Redis) únicamente durante el tiempo de vida del buzón, por defecto 10 minutos. No existe persistencia permanente. Los correos se eliminan automáticamente al expirar el buzón.
> EN: Email content is stored in memory (Redis) only for the duration of the mailbox lifetime, 10 minutes by default. There is no permanent storage. Emails are automatically deleted when the mailbox expires.

**Sección 3 — Servicios de terceros / Third-party services**
> ES: TmpMail utiliza la API de Mail.tm para recibir correos. Los dominios de correo son provistos por ese servicio. Consulta la política de privacidad de Mail.tm para más información sobre el tratamiento de datos en su plataforma.
> EN: TmpMail uses the Mail.tm API to receive emails. Email domains are provided by that service. Please review Mail.tm's privacy policy for information about data handling on their platform.

**Sección 4 — Contacto / Contact**
> ES: Para cualquier consulta sobre privacidad, escríbenos a contacto@tmpmailio.com.
> EN: For any privacy-related inquiries, contact us at contacto@tmpmailio.com.

---

#### Terms (`/[locale]/terms`)

Título: **"Términos"** / **"Terms"**
Fecha: Última actualización: marzo 2026 / Last updated: March 2026

**Sección 1 — Uso aceptable / Acceptable use**
> ES: TmpMail es un servicio de correo temporal para uso personal y legítimo: pruebas de software, registros en sitios web, evitar spam. Está estrictamente prohibido usar este servicio para enviar o recibir contenido ilegal, realizar spam masivo o suplantar identidades.
> EN: TmpMail is a temporary email service for personal and legitimate use: software testing, website registrations, avoiding spam. It is strictly prohibited to use this service to send or receive illegal content, perform mass spam, or impersonate others.

**Sección 2 — Sin garantías / No warranties**
> ES: El servicio se ofrece "tal cual" sin garantías de disponibilidad, velocidad de entrega ni conservación de mensajes. No uses TmpMail para comunicaciones críticas, confidenciales o legalmente relevantes.
> EN: The service is provided "as is" without warranties of availability, delivery speed, or message retention. Do not use TmpMail for critical, confidential, or legally significant communications.

**Sección 3 — Limitación de responsabilidad / Limitation of liability**
> ES: TmpMail no es responsable de pérdida de datos, correos no entregados, interrupciones del servicio ni daños de ningún tipo derivados del uso del servicio.
> EN: TmpMail is not liable for data loss, undelivered emails, service interruptions, or any damages of any kind arising from the use of the service.

---

#### Contact (`/[locale]/contact`)

Título: **"Contacto"** / **"Contact"**

Componente client: `components/contact/ContactForm.tsx`

**Campos:**
| Campo | Tipo | Validación |
|-------|------|-----------|
| Tu email | `input[type=email]` | Requerido, formato válido |
| Asunto | `select` | Requerido |
| Mensaje | `textarea` | Requerido, mínimo 20 caracteres |

**Opciones del select (ES):** Problema técnico / Sugerencia / Abuso o spam / Otro
**Opciones del select (EN):** Technical issue / Suggestion / Abuse or spam / Other

**Envío:** `mailto:contacto@tmpmailio.com` con subject y body pre-rellenados:
```ts
const subject = encodeURIComponent(`[TmpMail] ${asunto}`)
const body = encodeURIComponent(`De: ${email}\n\n${mensaje}`)
window.location.href = `mailto:contacto@tmpmailio.com?subject=${subject}&body=${body}`
```

**Validación client-side:** verificar que todos los campos están completos y el email tiene formato válido antes de abrir el mailto. Mostrar errores inline bajo cada campo.

---

## Oleada 2 — Diseño detallado

### 2.1 Toast — mecanismo de señalización

**El problema:** `useSocket` necesita disparar un toast que se muestra en `page.tsx`. Ambos ya usan `useMailboxStore` (Zustand), por lo que la solución más limpia es añadir el estado de toast al store existente.

**Cambios a `store/mailboxStore.ts`:**

Añadir al interface `MailboxStore`:
```ts
toastMessage: string | null
showToast: (message: string) => void
clearToast: () => void
```

Añadir al store:
```ts
toastMessage: null,
showToast: (message) => {
  set({ toastMessage: message })
  setTimeout(() => set({ toastMessage: null }), 3000)
},
clearToast: () => set({ toastMessage: null }),
```

**Uso en `useSocket.ts`:** llamar `showToast("Buzón renovado automáticamente")` tras crear el nuevo buzón.

**Uso en `page.tsx`:** leer `toastMessage` del store y renderizar `<Toast>` condicionalmente.

---

### 2.2 Toast component

**Archivo nuevo:** `components/ui/Toast.tsx`

```tsx
interface ToastProps {
  message: string
}
```

**Nota de path:** el componente `ContactForm` va en `components/contact/ContactForm.tsx` (no en `components/ContactForm.tsx`). Todas las referencias en el código deben usar esa ruta.

**Diseño:**
- `position: fixed`, `bottom: 24px`, `right: 24px`, `z-index: 50`
- Fondo: `var(--bg-secondary)`
- Border: `1px solid var(--border)`, borde izquierdo `3px solid var(--accent-primary)`
- Texto: font-mono 12px, `var(--text-primary)`
- Punto decorativo: div 6×6px `var(--accent-primary)`, `flex-shrink: 0`
- Animación: `animate-slide-right` (ya definida en `tailwind.config.ts` / `globals.css`)

---

### 2.3 Expiración auto-silenciosa

**Archivo modificado:** `hooks/useSocket.ts`

**Evento correcto:** `mailbox_expired` (snake_case — verificado en el código actual).

**Cambio en el handler:**
```
Antes:  socket.on("mailbox_expired", ({ mailboxId }) => { if (...) setExpired() })
Después: socket.on("mailbox_expired", ({ mailboxId }) => {
           if (mailboxId !== mailbox?.id) return
           createMailbox()          // auto-crea buzón nuevo
           showToast(t("toast.mailboxRenewed"))  // toast 3s
           sendNotification("TmpMail", t("notifications.renewed"))  // notif SO
         })
```

`createMailbox` y `showToast` se obtienen de `useMailboxStore()` dentro del hook. Añadir dos llamadas a `useTranslations` al hook (los React hooks pueden llamar a otros hooks):
```ts
const tToast = useTranslations("toast")
const tNotif = useTranslations("notifications")
```
Usar `tToast("mailboxRenewed")` para el toast y `tNotif("renewed")` para la notificación del SO.
`sendNotification` se importa de `lib/notifications.ts`.

**Cambio en la destructuración de `useMailboxStore`:** eliminar `setExpired` (ya no se usa en este hook) y añadir `createMailbox` y `showToast`:
```ts
// Antes:
const { mailbox, addIncomingEmail, setExpired, setConnected } = useMailboxStore()
// Después:
const { mailbox, addIncomingEmail, createMailbox, showToast, setConnected } = useMailboxStore()
```

**Nota:** ya no se llama `setExpired()` directamente — `createMailbox()` hace `set({ mailbox: data.mailbox, emails: [], selectedEmail: null })` que reemplaza el estado completamente.

---

### 2.4 Notificaciones del navegador

**Archivo nuevo:** `lib/notifications.ts`

```ts
export function sendNotification(title: string, body: string): void {
  if (typeof window === "undefined") return
  if (Notification.permission !== "granted") return
  new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
  })
}
```

**Tres eventos:**

| Origen | Cuándo | Título | Body |
|--------|--------|--------|------|
| `useSocket.ts` | Email nuevo | `"TmpMail"` | `De: {from}` |
| `ExpirationTimer.tsx` | `timeLeft <= 120` | `"TmpMail"` | t("notifications.expiringSoon") |
| `useSocket.ts` | Buzón renovado | `"TmpMail"` | t("notifications.renewed") |

**Notificación de expiración próxima en `ExpirationTimer.tsx`:**
- Añadir `const warnedRef = useRef(false)`
- Añadir un `useEffect` **separado y dedicado** solo para el reset:
  ```ts
  useEffect(() => { warnedRef.current = false }, [expiresAt])
  ```
  Esto garantiza el reset solo cuando cambia el buzón (nueva `expiresAt`), sin acoplarlo al efecto del intervalo que también depende de `onExpired`
- Dentro del tick del intervalo existente: `if (timeLeft <= 120 && !warnedRef.current) { warnedRef.current = true; sendNotification(...) }`
- Garantía: exactamente una notificación por buzón, robusta frente a cambios de referencia de `onExpired`

**Solicitud de permiso — botón nuevo en `InboxPanel.tsx`:**
El componente actualmente solo tiene un botón de Refresh en el header del panel. Se añade un segundo botón:
- Posición: junto al botón Refresh, en el mismo row del header
- Icono: `Bell` de lucide-react (o `BellOff` si el permiso está denegado)
- Comportamiento: `onClick → Notification.requestPermission()`
- Estado visual: si `Notification.permission === "granted"`, borde/color con `var(--accent-primary)`; si `"denied"`, desactivado con opacidad reducida
- Estado local `notifPermission` inicializado con `Notification.permission ?? "default"`, actualizado tras la llamada a `requestPermission()`
- Guard: `if (typeof window === "undefined" || !("Notification" in window)) return null` — no renderizar en SSR

---

### 2.5 Selector de dominio en address-box

**Archivo modificado:** `app/[locale]/page.tsx`

**Estado local nuevo:**
```ts
const [showDomainPicker, setShowDomainPicker] = useState(false)
```

**Parsing de la dirección:**
```ts
const [addrUser, addrDomain] = (mailbox?.address ?? "").split("@")
```

**Cambio en el address-box** — el `displayedAddress` se reemplaza por dos spans:
```tsx
<span style={{ color: "var(--accent-primary)" }}>
  {/* Parte usuario del typewriter */}
  {displayedAddress.split("@")[0]}
  {/* @ siempre visible */}
  @
  {/* Dominio clickeable — solo visible cuando el typewriter llegó al @ */}
  {displayedAddress.includes("@") && (
    <span
      onClick={() => setShowDomainPicker(v => !v)}
      style={{
        cursor: "pointer",
        borderBottom: "1px solid rgba(184,255,53,0.4)",
        paddingBottom: "1px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {addrDomain}
      <span style={{ fontSize: "10px", opacity: 0.7 }}>▼</span>
    </span>
  )}
</span>
```

**Dropdown:** envolver el address-box en un `div` con `position: relative`. Al abrir `showDomainPicker`, renderizar `<DomainDropdown>` con:
- `position: absolute`, `top: 100%`, `left: 0`, `zIndex: 50`
- `onSelect={(domain) => { handleNewMailbox(domain); setShowDomainPicker(false) }}`
- `onClose={() => setShowDomainPicker(false)}`

Verificar que `DomainDropdown` acepta y usa un prop `onClose` para cerrar al hacer clic fuera — si no lo tiene, añadirlo.

**`handleNewMailbox`** ya existe en `page.tsx` y acepta un `domain?: string` opcional.

---

## Traducciones

### Claves nuevas a añadir en `messages/es.json` y `messages/en.json`

```jsonc
// messages/es.json (añadir junto a los namespaces existentes)
"toast": {
  "mailboxRenewed": "Buzón renovado automáticamente"
},
"notifications": {
  "expiringSoon": "Tu buzón expira en 2 minutos",
  "renewed": "Se ha creado una nueva dirección"
},
"notFound": {
  "label": "// error",
  "message": "Esta página no existe.",
  "back": "← Volver al inicio"
},
"legal": {
  "updatedEs": "Última actualización: marzo 2026",
  "privacy": {
    "title": "Privacidad",
    "s1Title": "Datos que NO recopilamos",
    "s1Body": "TmpMail no almacena direcciones IP, no requiere registro y no usa cookies de rastreo ni análisis de comportamiento. No existe ningún perfil de usuario asociado a tu uso del servicio.",
    "s2Title": "Datos que procesamos temporalmente",
    "s2Body": "El contenido de los correos recibidos se almacena en memoria (Redis) únicamente durante el tiempo de vida del buzón, por defecto 10 minutos. Los correos se eliminan automáticamente al expirar el buzón.",
    "s3Title": "Servicios de terceros",
    "s3Body": "TmpMail utiliza la API de Mail.tm para recibir correos. Consulta la política de privacidad de Mail.tm para más información sobre el tratamiento de datos en su plataforma.",
    "s4Title": "Contacto",
    "s4Body": "Para cualquier consulta sobre privacidad, escríbenos a contacto@tmpmailio.com."
  },
  "terms": {
    "title": "Términos",
    "s1Title": "Uso aceptable",
    "s1Body": "TmpMail es un servicio de correo temporal para uso personal y legítimo: pruebas de software, registros en sitios web, evitar spam. Está estrictamente prohibido usar este servicio para enviar o recibir contenido ilegal, realizar spam masivo o suplantar identidades.",
    "s2Title": "Sin garantías",
    "s2Body": "El servicio se ofrece \"tal cual\" sin garantías de disponibilidad, velocidad de entrega ni conservación de mensajes. No uses TmpMail para comunicaciones críticas, confidenciales o legalmente relevantes.",
    "s3Title": "Limitación de responsabilidad",
    "s3Body": "TmpMail no es responsable de pérdida de datos, correos no entregados, interrupciones del servicio ni daños de ningún tipo derivados del uso del servicio."
  },
  "contact": {
    "title": "Contacto",
    "subtitle": "Respuesta en 24–48 horas",
    "emailLabel": "Tu email de respuesta",
    "subjectLabel": "Asunto",
    "messageLabel": "Mensaje",
    "messagePlaceholder": "Describe tu consulta (mínimo 20 caracteres)...",
    "send": "Enviar →",
    "subjects": ["Problema técnico", "Sugerencia", "Abuso o spam", "Otro"]
  }
}
```

```jsonc
// messages/en.json (claves equivalentes)
"toast": {
  "mailboxRenewed": "Mailbox automatically renewed"
},
"notifications": {
  "expiringSoon": "Your mailbox expires in 2 minutes",
  "renewed": "A new address has been created"
},
"notFound": {
  "label": "// error",
  "message": "This page does not exist.",
  "back": "← Back to home"
},
"legal": {
  "updatedEs": "Last updated: March 2026",
  "privacy": {
    "title": "Privacy",
    "s1Title": "Data we do NOT collect",
    "s1Body": "TmpMail does not store IP addresses, requires no registration, and uses no tracking or analytics cookies. No user profile is created from your use of the service.",
    "s2Title": "Data we process temporarily",
    "s2Body": "Email content is stored in memory (Redis) only for the duration of the mailbox lifetime, 10 minutes by default. There is no permanent storage. Emails are automatically deleted when the mailbox expires.",
    "s3Title": "Third-party services",
    "s3Body": "TmpMail uses the Mail.tm API to receive emails. Please review Mail.tm's privacy policy for information about data handling on their platform.",
    "s4Title": "Contact",
    "s4Body": "For any privacy-related inquiries, contact us at contacto@tmpmailio.com."
  },
  "terms": {
    "title": "Terms",
    "s1Title": "Acceptable use",
    "s1Body": "TmpMail is a temporary email service for personal and legitimate use: software testing, website registrations, avoiding spam. It is strictly prohibited to use this service to send or receive illegal content, perform mass spam, or impersonate others.",
    "s2Title": "No warranties",
    "s2Body": "The service is provided \"as is\" without warranties of availability, delivery speed, or message retention. Do not use TmpMail for critical, confidential, or legally significant communications.",
    "s3Title": "Limitation of liability",
    "s3Body": "TmpMail is not liable for data loss, undelivered emails, service interruptions, or any damages of any kind arising from the use of the service."
  },
  "contact": {
    "title": "Contact",
    "subtitle": "Response within 24–48 hours",
    "emailLabel": "Your reply email",
    "subjectLabel": "Subject",
    "messageLabel": "Message",
    "messagePlaceholder": "Describe your inquiry (minimum 20 characters)...",
    "send": "Send →",
    "subjects": ["Technical issue", "Suggestion", "Abuse or spam", "Other"]
  }
}
```

---

## Archivos afectados

### Nuevos
| Archivo | Descripción |
|---------|-------------|
| `app/icons/icon-192.png/route.tsx` | PWA icon 192×192 via ImageResponse |
| `app/icons/icon-512.png/route.tsx` | PWA icon 512×512 via ImageResponse |
| `app/[locale]/not-found.tsx` | Página 404 con glitch |
| `app/[locale]/privacy/page.tsx` | Política de privacidad |
| `app/[locale]/terms/page.tsx` | Términos de uso |
| `app/[locale]/contact/page.tsx` | Página de contacto (usa ContactForm) |
| `components/contact/ContactForm.tsx` | Client component — formulario de contacto (mailto) |
| `components/ui/Toast.tsx` | Toast component |
| `lib/notifications.ts` | Utilidad sendNotification() |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `public/manifest.json` | `theme_color` y `background_color` → `#B8FF35` / `#080808` |
| `app/globals.css` | Añadir `@keyframes glitch` + clase `.glitch` |
| `store/mailboxStore.ts` | Añadir `toastMessage`, `showToast`, `clearToast` |
| `hooks/useSocket.ts` | `mailbox_expired` → auto-crea + toast + notificación |
| `components/Timer/ExpirationTimer.tsx` | Notificación a los 2 min con `warnedRef` |
| `app/[locale]/page.tsx` | Address-box con dominio clickeable + render `<Toast>` |
| `messages/es.json` | Namespaces `toast`, `notifications`, `notFound`, `legal` |
| `messages/en.json` | Mismos namespaces en inglés |

---

## Fuera de alcance

- Backend para el formulario de contacto (v1 usa `mailto:contacto@tmpmailio.com`)
- Páginas legales adicionales (cookies, DMCA)
- Extensión de navegador (spec separado)
- Infraestructura Nginx (documentado en `docs/NGINX-SEO.md`)
