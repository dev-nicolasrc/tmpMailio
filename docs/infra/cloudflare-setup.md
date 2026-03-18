# Cloudflare CDN Setup — tmpmailio.com

**Impacto:** TTFB 695ms → <100ms para usuarios fuera de Brasil.
**Tier:** Gratuito (suficiente para este caso de uso).

---

## Pasos

### 1. Crear cuenta y añadir dominio

1. Ir a https://cloudflare.com y crear una cuenta gratuita.
2. Clic en **"Add a site"** → escribir `tmpmailio.com` → seleccionar plan **Free**.
3. Cloudflare escaneará los registros DNS existentes automáticamente.
4. Verificar que el registro A aparece: `tmpmailio.com → 187.77.234.184`.
5. Si no aparece, añadirlo manualmente:
   - Type: `A`
   - Name: `@`
   - IPv4: `187.77.234.184`
   - Proxy status: **Proxied** (nube naranja)

### 2. Delegar nameservers

Cloudflare asignará dos nameservers propios (ejemplo: `ada.ns.cloudflare.com`).

En el panel de tu registrador de dominio, reemplaza los nameservers actuales con los dos que Cloudflare indique. La propagación tarda 0-48 horas.

**Verificar propagación:**
```bash
dig NS tmpmailio.com +short
# Debe mostrar los nameservers de Cloudflare
```

### 3. Configurar SSL/TLS

- En Cloudflare → **SSL/TLS** → **Overview** → seleccionar **Full (strict)**.
- Esto requiere que el servidor origen tenga un certificado válido (Let's Encrypt está bien).

### 4. Configurar Cache Rules

En Cloudflare → **Caching** → **Cache Rules** → **Create rule**:

- **Rule name:** Cache everything
- **When incoming requests match:** `Hostname equals tmpmailio.com`
- **Then:** Cache eligibility → **Eligible for cache**
- **Edge TTL:** Use cache-control header (Next.js ya envía `s-maxage=31536000`)
- **Browser TTL:** Respect existing headers

Clic en **Deploy**.

### 5. Habilitar Brotli

En Cloudflare → **Speed** → **Optimization** → **Content Optimization**:
- Habilitar **Brotli compression** (toggle ON).

### 6. Configurar www → apex redirect (si aplica)

Si `www.tmpmailio.com` no redirige a `tmpmailio.com`, añadir en Cloudflare → **Rules** → **Redirect Rules**:
- Source: `www.tmpmailio.com/*`
- Target: `https://tmpmailio.com/$1`
- Status: 301

---

## Verificación

```bash
# Verificar CDN activo (debe mostrar cf-ray header)
curl -I https://tmpmailio.com/es | grep -i "cf-ray"

# Verificar cache hit de Next.js
curl -I https://tmpmailio.com/es | grep -i "x-nextjs-cache"
# Esperado: x-nextjs-cache: HIT

# Medir TTFB desde distintas ubicaciones
curl -w "TTFB: %{time_starttransfer}s\n" -o /dev/null -s https://tmpmailio.com/es
# Esperado: <0.1s desde Europa/EEUU
```

---

## Notas

- El plan gratuito incluye ancho de banda ilimitado para CDN, suficiente para este proyecto.
- Cloudflare respeta automáticamente el `Cache-Control: s-maxage=31536000` que envía Next.js ISR.
- No configurar **Minify** de Cloudflare (HTML/CSS/JS) — Next.js ya los minifica en build.
