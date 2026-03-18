# Auditoría Socket.IO — tmpmailio.com
**Fecha:** 2026-03-18
**Decisión:** Mantener Socket.IO — migración no justificada en este ciclo.

---

## Archivos usando Socket.IO

| Archivo | Rol |
|---------|-----|
| `apps/frontend/lib/socket.ts` | Inicialización del cliente (`io()`) con singleton |
| `apps/frontend/hooks/useSocket.ts` | Hook que maneja todos los eventos del socket |

## Features de Socket.IO en uso

| Feature | Usado | Necesario para migración |
|---------|-------|--------------------------|
| `socket.connect()` / `socket.disconnect()` | Sí | Nativo en WebSocket |
| `socket.emit("join_mailbox", ...)` | Sí | Requiere protocolo personalizado en el servidor |
| `socket.emit("leave_mailbox", ...)` | Sí | Requiere protocolo personalizado en el servidor |
| `socket.on("new_email", ...)` | Sí | Evento del servidor → cliente |
| `socket.on("mailbox_expired", ...)` | Sí | Evento del servidor → cliente |
| `socket.on("mailbox_deleted", ...)` | Sí | Evento del servidor → cliente |
| `socket.on("connect")` / `socket.on("disconnect")` | Sí | Nativo en WebSocket |
| `reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 10` | Sí | Requiere implementación manual |
| `autoConnect: false` | Sí | Nativo en WebSocket |
| Namespaces | No | N/A |
| Rooms (server-side) | Sí (join_mailbox) | Sería lógica custom en el servidor |
| Binary/streaming | No | N/A |

## Análisis

El uso de Socket.IO es **simple y bidireccional**: el cliente se une a una sala por mailboxId y escucha 3 tipos de eventos del servidor. No se usan namespaces, broadcasting complejo ni features avanzadas de Socket.IO.

**Peso actual del bundle:** ~124 KB (socket.io-client, sin comprimir).

**Coste de migración a WebSocket nativo:**
- **Frontend:** Moderado. Reemplazar `io()` con `new WebSocket()`, implementar auto-reconnect manual con backoff exponencial, implementar el protocolo de mensajes (actualmente usando el formato de Socket.IO: `{ event, data }`).
- **Backend:** Requiere colaboración. El servidor Express/Node usa `socket.io` para manejar rooms y eventos. Migrar el servidor a `ws` (WebSocket nativo) implica re-implementar la lógica de rooms y el broadcast de eventos.
- **Riesgo:** Medio. La lógica de reconexión y la gestión de rooms es el punto más delicado.

## Recomendación

**Mantener Socket.IO por ahora.**

Razones:
1. El bundle de Socket.IO (124 KB) es el menor de los tres grandes (ya se eliminó Framer Motion 172 KB y se optimizó Lucide ~175 KB).
2. La migración requiere cambios coordinados frontend + backend.
3. El ROI es moderado comparado con el riesgo de romper la funcionalidad de tiempo real.

**Reevaluar en Fase 4** si el presupuesto de bundle vuelve a ser un problema, o cuando se haga un refactor del backend. En ese momento, usar la librería `reconnecting-websocket` (2 KB) para el auto-reconnect en lugar de implementarlo desde cero.

## Verificación actual del tamaño

```bash
# Desde apps/frontend
ANALYZE=true npm run build
# Revisar en el bundle analyzer: chunk que incluye socket.io-client
```
