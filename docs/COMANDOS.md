# TmpMail — Comandos de Operación

## Stack
- **Node.js** v20 · **PM2** v6 · **Redis** 6 · **MongoDB** 7
- **Backend**: Express + Socket.io en `/app/apps/backend`
- **Frontend**: Next.js 14 en `/app/apps/frontend`
- **Config PM2**: `/app/ecosystem.config.js`
- **Variables de entorno**: `/app/.env` (backend) · `/app/apps/frontend/.env.local` (frontend)

---

## PM2 — Producción (uso diario)

```bash
# Ver estado de todos los procesos
pm2 list

# Ver logs en tiempo real
pm2 logs
pm2 logs backend          # solo backend
pm2 logs frontend         # solo frontend
pm2 logs backend --lines 50   # últimas 50 líneas

# Reiniciar
pm2 restart backend
pm2 restart frontend
pm2 restart all

# Parar / Arrancar
pm2 stop all
pm2 start ecosystem.config.js

# Eliminar procesos (para reconfigurar desde cero)
pm2 delete all
pm2 start ecosystem.config.js
```

---

## Backend

### Desarrollo (hot-reload)
```bash
cd /app/apps/backend
npx tsx watch src/server.ts
```

### Compilar TypeScript → dist/
```bash
cd /app/apps/backend
npx tsc --build
```

### Compilar + reiniciar en producción
```bash
cd /app/apps/backend
npx tsc --build && pm2 restart backend
```

### Ver logs de error del backend
```bash
pm2 logs backend --err --lines 30
```

---

## Frontend

### Desarrollo (hot-reload)
```bash
cd /app/apps/frontend
npx next dev
```

### Compilar para producción
```bash
cd /app/apps/frontend
npx next build
```

### Compilar + reiniciar en producción
```bash
cd /app/apps/frontend
npx next build && pm2 restart frontend
```

---

## Flujo completo de deploy (backend + frontend)

```bash
# 1. Compilar backend
cd /app/apps/backend && npx tsc --build

# 2. Compilar frontend
cd /app/apps/frontend && npx next build

# 3. Reiniciar ambos
pm2 restart all

# 4. Verificar que todo está online
pm2 list
```

---

## Redis

```bash
# Estado del servicio
systemctl status redis

# Iniciar / reiniciar
systemctl start redis
systemctl restart redis

# Consola interactiva
redis-cli

# Ver todas las claves activas
redis-cli KEYS "*"

# Ver datos de un buzón (reemplaza el ID)
redis-cli HGETALL "mailbox:ABC123"

# Limpiar TODA la base de datos (⚠️ borra todos los buzones activos)
redis-cli FLUSHALL

# Limpiar solo rate limit si hay bloqueos
redis-cli KEYS "ratelimit:*" | xargs redis-cli DEL
```

---

## MongoDB

```bash
# Estado del servicio
systemctl status mongod

# Iniciar / reiniciar
systemctl start mongod
systemctl restart mongod

# Consola interactiva
mongosh

# Dentro de mongosh — ver base de datos
use tmpmail
db.mailboxes.countDocuments()
db.emails.countDocuments()

# Eliminar emails de buzones expirados
db.mailboxes.find({ status: "expired" }).forEach(m => {
  db.emails.deleteMany({ mailboxId: m.mailboxId })
})
```

---

## Verificar que la API funciona

```bash
# Health check
curl http://localhost:4000/health

# Dominios disponibles (via Mail.tm)
curl http://localhost:4000/api/domains

# Crear un buzón de prueba
curl -s -X POST http://localhost:4000/api/mailbox/create \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool

# Ver emails de un buzón (reemplaza MAILBOX_ID)
curl http://localhost:4000/api/mailbox/MAILBOX_ID/emails
```

---

## Variables de entorno

### `/app/.env` (backend)
```env
REDIS_URL=redis://localhost:6379
MONGO_URI=mongodb://localhost:27017/tmpmail
PORT=4000
CORS_ORIGIN=http://187.77.234.184:3000
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX=200
MAILBOX_TTL=600
MAILBOX_TTL_EXTEND=300
MAX_ATTACHMENT_SIZE=5242880
```

### `/app/apps/frontend/.env.local` (frontend)
```env
NEXT_PUBLIC_API_URL=http://187.77.234.184:4000
NEXT_PUBLIC_SOCKET_URL=http://187.77.234.184:4000
NEXT_PUBLIC_DEFAULT_LOCALE=es
```

> ⚠️ Después de cambiar `.env`, hay que recompilar el backend (`npx tsc --build`) y reiniciar (`pm2 restart backend`).
> Después de cambiar `.env.local`, hay que recompilar el frontend (`npx next build`) y reiniciar (`pm2 restart frontend`).

---

## Puertos

| Servicio  | Puerto | URL                          |
|-----------|--------|------------------------------|
| Frontend  | 3000   | http://187.77.234.184:3000   |
| Backend   | 4000   | http://187.77.234.184:4000   |
| Redis     | 6379   | localhost:6379               |
| MongoDB   | 27017  | localhost:27017              |

---

## Solución de problemas comunes

### Puerto ya en uso (EADDRINUSE)
```bash
fuser -k 4000/tcp   # libera el puerto 4000
fuser -k 3000/tcp   # libera el puerto 3000
pm2 restart all
```

### Frontend no carga estilos / cambios no aparecen
```bash
cd /app/apps/frontend && npx next build && pm2 restart frontend
```

### CORS error en el navegador
1. Verificar que `CORS_ORIGIN` en `/app/.env` coincide con la URL del frontend
2. Recompilar y reiniciar backend:
```bash
cd /app/apps/backend && npx tsc --build && pm2 restart backend
```

### Rate limit 429 (demasiados buzones)
```bash
# Reiniciar backend limpia el contador (está en memoria)
pm2 restart backend

# O aumentar el límite en /app/.env:
# RATE_LIMIT_MAX=200
```

### PM2 no arranca al reiniciar el servidor
```bash
pm2 startup    # genera el comando systemd (ejecutar el resultado)
pm2 save       # guarda la lista de procesos actual
```
