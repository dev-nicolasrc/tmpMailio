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
| `/contact` | Formulario de contacto |

### Oleada 2 — Comportamiento

| Feature | Descripción |
|---------|-------------|
| Expiración auto-silenciosa | Al expirar el buzón, crear uno nuevo + toast breve |
| Notificaciones completas | Correos nuevos + expiración próxima (2 min) + buzón renovado |
| Selector de dominio | `@dominio ▼` clickeable en el address-box abre dropdown |

---

## Oleada 1 — Diseño detallado

### 1.1 PWA Icons

**Problema:** `manifest.json` referencia `/icons/icon-192.png` e `/icons/icon-512.png` que dan 404. El `theme_color` es `#6C63FF` (incorrecto, debe ser `#B8FF35`).

**Solución:** Route handlers de Next.js que sirven las imágenes con `ImageResponse` — sin archivos estáticos que mantener manualmente.

**Archivos nuevos:**
- `app/icons/icon-192.png/route.tsx` — ImageResponse 192×192
- `app/icons/icon-512.png/route.tsx` — ImageResponse 512×512

**Diseño del icono:**
- Fondo: `#080808`
- Texto: `TMP` en `#B8FF35`, tipografía monospace bold, centrado
- Borde/acento inferior: línea `#B8FF35` de 4px

**Cambios a archivos existentes:**
- `public/manifest.json`: corregir `theme_color` de `#6C63FF` → `#B8FF35`

---

### 1.2 Página 404

**Archivo:** `app/[locale]/not-found.tsx`

Next.js invoca automáticamente este archivo cuando una ruta bajo `[locale]` no existe.

**Estructura:**
```
Header (nav de la app)
  ├── // error · label pequeño
  ├── "404" — grande, animación glitch CSS
  ├── Mensaje: "Esta página no existe."
  └── Botón: "← Volver al inicio" → Link a `/${locale}`
Footer
```

**Animación glitch:** usar la animación `glitch` definida en `globals.css` (o añadirla si no existe). Efecto: `text-shadow` con desplazamiento rojo/lime que se activa cada 4s.

**Implementación:** server component. Obtiene `locale` de `params`. Usa el layout de la app (header + footer ya renderizados por `layout.tsx`).

---

### 1.3 Páginas legales

**Archivos nuevos:**
- `app/[locale]/privacy/page.tsx`
- `app/[locale]/terms/page.tsx`
- `app/[locale]/contact/page.tsx`

Todas son server components excepto el formulario de contacto (client component).

**Layout compartido:** header/footer ya provistos por `[locale]/layout.tsx`. Cada página tiene:
- Label sistema: `// sección`
- Título H1 grande
- Fecha de última actualización
- Secciones con título `#B8FF35` prefijado por `//`

#### Privacy (`/privacy`)

Secciones:
1. **Datos que NO recopilamos** — sin IPs, sin registro, sin cookies de rastreo
2. **Datos que sí procesamos** — contenido de correos en Redis por 10 min, sin persistencia permanente
3. **Duración de los datos** — eliminación automática al expirar el buzón
4. **Servicios de terceros** — API Mail.tm (enlace a su política)

#### Terms (`/terms`)

Secciones:
1. **Uso aceptable** — uso personal y legítimo; prohibido spam masivo o actividades ilegales
2. **Sin garantías** — servicio "tal cual", no usar para comunicaciones críticas
3. **Limitación de responsabilidad** — sin responsabilidad por pérdida de datos o correos no entregados

#### Contact (`/contact`)

Formulario client component con 3 campos:
- Email de respuesta (type="email", requerido)
- Asunto (select: Problema técnico / Sugerencia / Abuso / Otro)
- Mensaje (textarea, mínimo 20 chars)

**Envío:** `mailto:` en v1. El botón genera un `mailto:` con los campos pre-rellenados. No requiere endpoint de backend nuevo.

**Traducciones:** añadir namespace `legal` a `messages/es.json` y `messages/en.json` con las claves de título, secciones y formulario.

---

## Oleada 2 — Diseño detallado

### 2.1 Toast component

**Archivos nuevos:**
- `components/ui/Toast.tsx` — componente de presentación
- Estado manejado con `useState` local en `page.tsx` (no Zustand — el toast es efímero y solo aparece en la página principal)

**API:**
```tsx
// Desde page.tsx
const [toast, setToast] = useState<string | null>(null)
// Mostrar: setToast("Buzón renovado automáticamente")
// El Toast se auto-oculta tras 3s
```

**Diseño del Toast:**
- Posición: `fixed`, bottom-right, `z-index: 50`
- Fondo: `var(--bg-secondary)`, border: `var(--border)`
- Borde izquierdo: 3px sólido `var(--accent-primary)`
- Texto: font-mono, 12px, `var(--text-primary)`
- Punto decorativo: 6×6px `var(--accent-primary)`
- Animación: `slideRight` (ya definida en globals.css)
- Duración: 3 segundos, luego `setToast(null)`

---

### 2.2 Expiración auto-silenciosa

**Archivo modificado:** `hooks/useSocket.ts`

El evento `mailbox:expired` ya es escuchado. Cambio:

```
Antes:  mailbox:expired → mailboxStore.setExpired()
Después: mailbox:expired → createMailbox() + showToast("Buzón renovado") + notificación SO
```

**Flujo:**
1. Socket recibe `mailbox:expired`
2. Llamar `createMailbox()` del store (sin argumento → dominio aleatorio)
3. Disparar toast: `"Buzón renovado automáticamente"`
4. Disparar notificación SO: `"TmpMail — Buzón renovado"` (si permisos concedidos)
5. El store limpia los emails del buzón anterior

**Nota:** `createMailbox` ya existe en `useMailbox`. Para conectar con `useSocket`, el store de Zustand expone la función directamente — no hace falta pasar callbacks.

---

### 2.3 Notificaciones del navegador

**Archivo modificado:** `hooks/useSocket.ts`

**Tres eventos de notificación:**

| Evento | Título | Cuerpo |
|--------|--------|--------|
| Email nuevo | "TmpMail — Nuevo correo" | `De: {remitente}` |
| Expiración próxima | "TmpMail — Buzón expirando" | "Tu buzón expira en 2 minutos" |
| Buzón renovado | "TmpMail — Buzón renovado" | "Se ha creado una nueva dirección" |

**Notificación de expiración próxima:**
- Manejada en `components/Timer/ExpirationTimer.tsx`
- Cuando `timeLeft <= 120` (2 minutos), disparar notificación una sola vez
- Usar `useRef<boolean>` como flag para no repetir la notificación en re-renders

**Solicitud de permiso:**
- El botón "Notificaciones" en `InboxPanel.tsx` ya existe
- Al hacer clic: `Notification.requestPermission()` → actualizar estado local
- Si el permiso ya fue concedido, el botón muestra estado activo

**Utilidad compartida:** función `sendNotification(title, body)` en `lib/notifications.ts`:
```ts
export function sendNotification(title: string, body: string) {
  if (typeof window === 'undefined') return
  if (Notification.permission !== 'granted') return
  new Notification(title, { body, icon: '/icons/icon-192.png' })
}
```

---

### 2.4 Selector de dominio en address-box

**Archivo modificado:** `app/[locale]/page.tsx`

**Cambio en el address-box:** el dominio de la dirección se divide en dos partes clickeables:

```
tmpx8a3k  @  [mail.tm ▼]
              ↕ (dropdown)
```

**Implementación:**
- Extraer `usuario` y `dominio` de `mailbox.address` (split en `@`)
- El span del dominio tiene `cursor: pointer`, `border-bottom` lime tenue, chevron `▼`
- Estado local `showDomainDropdown: boolean` en `page.tsx`
- Al abrir: posicionar `DomainDropdown` absolutamente debajo del address-box

**Integración con `DomainDropdown`:**
- `DomainDropdown` ya fetchea los dominios disponibles y tiene `onSelect(domain)` callback
- `onSelect`: llamar `createMailbox(domain)` → genera nuevo buzón con ese dominio
- Cerrar dropdown al seleccionar o al hacer clic fuera

**Botón "Nuevo correo":** se mantiene sin cambios — genera con dominio aleatorio.

---

## Traducciones

Añadir a `messages/es.json` y `messages/en.json`:

```json
"legal": {
  "privacy": {
    "title": "Privacidad",
    "updated": "Última actualización: marzo 2026",
    "sections": { ... }
  },
  "terms": { ... },
  "contact": {
    "title": "Contacto",
    "emailLabel": "Tu email",
    "subjectLabel": "Asunto",
    "messageLabel": "Mensaje",
    "send": "Enviar →",
    "subjects": ["Problema técnico", "Sugerencia", "Abuso / spam", "Otro"]
  }
},
"toast": {
  "mailboxRenewed": "Buzón renovado automáticamente"
},
"notifications": {
  "newEmail": "Nuevo correo",
  "expiringSoon": "Tu buzón expira en 2 minutos",
  "renewed": "Se ha creado una nueva dirección"
}
```

---

## Archivos afectados

### Nuevos
| Archivo | Descripción |
|---------|-------------|
| `app/icons/icon-192.png/route.tsx` | PWA icon 192×192 |
| `app/icons/icon-512.png/route.tsx` | PWA icon 512×512 |
| `app/[locale]/not-found.tsx` | Página 404 |
| `app/[locale]/privacy/page.tsx` | Política de privacidad |
| `app/[locale]/terms/page.tsx` | Términos de uso |
| `app/[locale]/contact/page.tsx` | Formulario de contacto |
| `components/ui/Toast.tsx` | Toast component |
| `lib/notifications.ts` | Utilidad sendNotification |

### Modificados
| Archivo | Cambio |
|---------|--------|
| `public/manifest.json` | `theme_color` corregido |
| `hooks/useSocket.ts` | Expiración auto-crea + notificaciones |
| `components/Timer/ExpirationTimer.tsx` | Notificación a los 2 min |
| `app/[locale]/page.tsx` | Address-box con dominio clickeable + Toast |
| `messages/es.json` | Namespaces `legal`, `toast`, `notifications` |
| `messages/en.json` | Namespaces `legal`, `toast`, `notifications` |

---

## Fuera de alcance

- Backend para el formulario de contacto (v1 usa `mailto:`)
- Páginas legales adicionales (cookies, DMCA, etc.)
- Extensión de navegador (spec separado)
- Infraestructura Nginx (documentado en `docs/NGINX-SEO.md`)
