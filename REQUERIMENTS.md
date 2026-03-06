# 📋 Requerimientos — OnePage Correos Temporales

> Stack: Next.js 14 + Node.js + Socket.io

---

## 🏗️ Arquitectura General

| Capa                    | Tecnología                 |
| ----------------------- | -------------------------- |
| Frontend                | Next.js 14 (App Router)    |
| Backend                 | Node.js + Express          |
| Tiempo Real             | Socket.io                  |
| Base de Datos (activos) | Redis                      |
| Base de Datos (logs)    | MongoDB                    |
| Servidor de Correo      | Postfix (catch-all)        |
| CDN / DNS               | Cloudflare                 |
| Infraestructura         | VPS Hetzner o DigitalOcean |

---

## 📁 Estructura de Carpetas

```
/
├── frontend/                        # Next.js App
│   ├── app/
│   │   ├── layout.tsx               # Layout global (fuentes, meta tags, tema)
│   │   ├── page.tsx                 # OnePage principal
│   │   └── api/                     # API Routes de Next.js (proxy al backend)
│   ├── components/
│   │   ├── Hero/                    # Sección principal con el correo generado
│   │   ├── Inbox/                   # Bandeja de entrada en tiempo real
│   │   ├── EmailViewer/             # Visor del correo recibido
│   │   ├── Toolbar/                 # Botones: copiar, refrescar, QR, borrar
│   │   ├── Timer/                   # Contador de expiración
│   │   ├── DomainSelector/          # Selector de dominio
│   │   ├── AdSlot/                  # Componente reutilizable para anuncios
│   │   ├── FAQ/                     # Sección FAQ con acordeones (SEO)
│   │   └── ThemeToggle/             # Botón Dark/Light mode
│   ├── hooks/
│   │   ├── useSocket.ts             # Hook para conexión Socket.io
│   │   ├── useMailbox.ts            # Hook para gestión del buzón
│   │   └── useClipboard.ts          # Hook para copiar al portapapeles
│   ├── store/
│   │   └── mailboxStore.ts          # Estado global con Zustand
│   ├── lib/
│   │   └── socket.ts                # Configuración cliente Socket.io
│   └── public/
│       └── sounds/                  # Sonido de notificación de correo nuevo
│
└── backend/                         # Node.js + Express
    ├── src/
    │   ├── server.ts                # Entry point (Express + Socket.io)
    │   ├── routes/
    │   │   ├── mailbox.ts           # Rutas del buzón
    │   │   └── emails.ts            # Rutas de correos
    │   ├── services/
    │   │   ├── mailboxService.ts    # Lógica de creación/expiración
    │   │   ├── emailService.ts      # Lógica de recepción y parseo
    │   │   └── cleanupService.ts    # Cron job de limpieza automática
    │   ├── socket/
    │   │   └── emailEvents.ts       # Eventos Socket.io
    │   ├── models/
    │   │   ├── Mailbox.ts           # Modelo MongoDB del buzón
    │   │   └── Email.ts             # Modelo MongoDB del correo
    │   └── config/
    │       ├── redis.ts             # Conexión Redis
    │       ├── mongo.ts             # Conexión MongoDB
    │       └── domains.ts           # Lista de dominios disponibles
    └── mail-server/
        └── postfix/                 # Configuración Postfix catch-all
```

---

## 🎨 Requerimientos de Diseño (UI/UX)

### Paleta de Colores — Dark Mode (por defecto)

| Variable             | Valor     | Uso                                  |
| -------------------- | --------- | ------------------------------------ |
| `--bg-primary`       | `#0A0A0F` | Fondo principal                      |
| `--bg-secondary`     | `#12121A` | Fondo de tarjetas                    |
| `--bg-tertiary`      | `#1A1A28` | Hover, bordes                        |
| `--accent-primary`   | `#6C63FF` | Violeta eléctrico — acción principal |
| `--accent-secondary` | `#00D4FF` | Cian — detalles e iconos             |
| `--text-primary`     | `#F0F0FF` | Texto principal                      |
| `--text-secondary`   | `#8888AA` | Texto secundario                     |
| `--success`          | `#00FF88` | Verde neón — correo recibido         |
| `--danger`           | `#FF4466` | Rojo — borrar / expirado             |

### Tipografía

| Uso                 | Fuente                         |
| ------------------- | ------------------------------ |
| Headings            | `Space Grotesk` (Google Fonts) |
| Body                | `Inter`                        |
| Dirección de correo | `JetBrains Mono`               |

### Animaciones y Micro-interacciones

- **Entrada de página:** Fade-in suave con `Framer Motion`
- **Correo generado:** Efecto de "typing" al aparecer la dirección
- **Botón Copiar:** Cambia a `✓ Copiado!` con animación de escala
- **Correo nuevo en bandeja:** Slide-in desde la derecha + sonido suave
- **Skeleton Loader:** Barras animadas en la bandeja mientras espera correos
- **Timer:** Círculo SVG animado que se vacía conforme pasa el tiempo
- **Hover en botones:** Glow effect con `box-shadow` del color accent

---

## 🧩 Requerimientos por Sección (OnePage)

### Sección 1 — Hero (Above the fold)

- Logo + nombre del sitio alineado a la izquierda
- Toggle Dark/Light mode alineado a la derecha
- Headline principal centrado: _"Tu correo temporal está listo"_
- Campo de texto grande con la dirección generada en fuente monospace
- Botón **Copiar** con animación de confirmación
- Barra de herramientas con:
  - 🔄 Nuevo correo
  - ▼ Selector de dominio (dropdown)
  - 📱 Generar QR
  - 🗑️ Borrar buzón
- Contador de expiración con barra de progreso circular (SVG)

### Sección 2 — Bandeja de Entrada (Inbox)

- Título: _"Bandeja de entrada"_ + toggle de notificaciones push
- Estado vacío: Skeleton Loader animado con mensaje _"Esperando correos..."_
- Al recibir un correo, mostrar tarjeta con:
  - Indicador verde de "nuevo"
  - Remitente (`De:`)
  - Asunto del correo
  - Tiempo relativo (_"Hace 2 segundos"_)
  - Botón `Abrir`
- Animación de entrada: slide-in desde la derecha

### Sección 3 — Visor de Correo

- Se abre como modal o panel lateral al hacer clic en un correo
- Renderiza HTML del correo de forma segura con `DOMPurify`
- Opción de alternar entre vista HTML y texto plano
- Soporte para descarga de archivos adjuntos
- Botón de cerrar / volver a la bandeja

### Sección 4 — Ad Slots (Monetización)

| Posición                   | Tamaño  | Dispositivo                   |
| -------------------------- | ------- | ----------------------------- |
| Debajo del Hero            | 728x90  | Desktop                       |
| Sidebar derecha            | 300x250 | Desktop                       |
| Debajo del correo generado | 320x100 | Móvil                         |
| Sticky footer              | 320x50  | Móvil                         |
| Interstitial suave         | —       | Ambos (máx. 1 vez cada 5 min) |

### Sección 5 — FAQ (SEO)

Acordeones con las siguientes preguntas:

1. ¿Qué es un correo temporal?
2. ¿Es seguro usar un correo desechable?
3. ¿Cuánto tiempo dura el correo temporal?
4. ¿Puedo recibir archivos adjuntos?
5. ¿Para qué sirve un correo temporal?
6. ¿Mis correos son privados?

### Sección 6 — Footer

- Logo + tagline corto
- Links: Privacidad | Términos | Contacto
- Selector de idioma (si se planea internacionalizar)
- Redes sociales (opcional)

---

## ⚙️ Requerimientos del Backend (Node.js)

### Endpoints REST

| Método   | Ruta                      | Descripción                    |
| -------- | ------------------------- | ------------------------------ |
| `POST`   | `/api/mailbox/create`     | Genera nuevo buzón y dirección |
| `DELETE` | `/api/mailbox/:id`        | Destruye buzón manualmente     |
| `GET`    | `/api/mailbox/:id/emails` | Lista correos del buzón        |
| `GET`    | `/api/email/:emailId`     | Obtiene contenido de un correo |
| `GET`    | `/api/domains`            | Lista dominios disponibles     |

### Eventos Socket.io

**Cliente → Servidor**

| Evento          | Payload         | Descripción             |
| --------------- | --------------- | ----------------------- |
| `join_mailbox`  | `{ mailboxId }` | Se suscribe a su buzón  |
| `leave_mailbox` | `{ mailboxId }` | Se desuscribe del buzón |

**Servidor → Cliente**

| Evento            | Payload         | Descripción               |
| ----------------- | --------------- | ------------------------- |
| `new_email`       | `{ email }`     | Nuevo correo recibido     |
| `mailbox_expired` | `{ mailboxId }` | Buzón expirado            |
| `mailbox_deleted` | `{ mailboxId }` | Buzón borrado manualmente |

### Lógica de Negocio

- Buzón activo por defecto: **10 minutos** (configurable)
- Extensión opcional: **+5 minutos** por cada correo recibido
- Limpieza automática: Cron job cada **5 minutos** borra buzones expirados
- Rate limiting: Máx. **10 buzones por IP por hora** (anti-abuso)
- Sanitización: `DOMPurify` en el frontend para renderizar HTML de correos de forma segura

---

## 🔒 Requerimientos de Seguridad

- `Helmet.js` en Express para headers de seguridad
- Rate limiting con `express-rate-limit`
- CORS configurado exclusivamente para el dominio propio
- Variables de entorno con `dotenv` (nunca hardcodear credenciales)
- Sanitización de HTML entrante con `DOMPurify` / `sanitize-html`
- No almacenar IPs de usuarios (privacidad)
- HTTPS obligatorio via Cloudflare o Let's Encrypt

---

## 📦 Dependencias

### Frontend (Next.js)

```json
{
  "next": "14.x",
  "react": "18.x",
  "framer-motion": "^11",
  "socket.io-client": "^4",
  "zustand": "^4",
  "dompurify": "^3",
  "qrcode.react": "^3",
  "lucide-react": "^0.400",
  "tailwindcss": "^3"
}
```

### Backend (Node.js)

```json
{
  "express": "^4",
  "socket.io": "^4",
  "mongoose": "^8",
  "ioredis": "^5",
  "nodemailer": "^6",
  "mailparser": "^3",
  "helmet": "^7",
  "express-rate-limit": "^7",
  "node-cron": "^3",
  "dotenv": "^16",
  "cors": "^2"
}
```

---

## 🚀 Requerimientos de Infraestructura

| Componente         | Opción recomendada               | Costo aprox. |
| ------------------ | -------------------------------- | ------------ |
| VPS                | Hetzner CX21 (2 vCPU, 4GB RAM)   | ~€5/mes      |
| CDN / DNS          | Cloudflare (Free plan)           | Gratis       |
| SSL                | Cloudflare o Let's Encrypt       | Gratis       |
| Dominio            | Namecheap o Cloudflare Registrar | ~$10/año     |
| Monitoreo          | UptimeRobot                      | Gratis       |
| Gestor de procesos | PM2                              | Gratis       |

---

## ✅ Checklist de Lanzamiento

### Infraestructura

- [ ] Dominio registrado y apuntando al VPS
- [ ] Postfix configurado como catch-all en el dominio
- [ ] SSL activo (HTTPS)
- [ ] Cloudflare activado como proxy

### Backend

- [ ] Rate limiting activo
- [ ] Variables de entorno configuradas
- [ ] Cron job de limpieza funcionando
- [ ] Socket.io probado con múltiples conexiones simultáneas

### Frontend

- [ ] Meta tags SEO (title, description, OG tags)
- [ ] Sitemap.xml generado
- [ ] Robots.txt configurado
- [ ] Favicon y PWA manifest configurados
- [ ] Dark/Light mode funcionando
- [ ] Responsive en móvil y desktop

### Monetización

- [ ] AdSense aprobado o red de anuncios alternativa lista
- [ ] Ad slots posicionados correctamente
- [ ] Google Analytics o Plausible instalado

### QA

- [ ] Prueba de carga básica (100 usuarios simultáneos)
- [ ] Prueba de sanitización de HTML en correos entrantes
- [ ] Prueba de expiración y limpieza de buzones
- [ ] Prueba de notificaciones en tiempo real
