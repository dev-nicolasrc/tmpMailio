# Nginx — Configuración SEO / Performance

Configuración para agregar en el servidor de producción (`/etc/nginx/sites-available/tmpmailio.com`).

## 1. Gzip + Brotli

Agregar dentro del bloque `http {}` en `/etc/nginx/nginx.conf`:

```nginx
# Gzip
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 256;
gzip_types
  text/plain
  text/css
  text/javascript
  application/javascript
  application/json
  application/x-javascript
  image/svg+xml
  image/x-icon
  font/woff
  font/woff2
  application/font-woff2;

# Brotli (requiere módulo ngx_brotli — ver instalación abajo)
brotli on;
brotli_comp_level 6;
brotli_min_length 256;
brotli_types
  text/plain
  text/css
  text/javascript
  application/javascript
  application/json
  image/svg+xml
  font/woff2;
```

### Instalar módulo Brotli en Ubuntu
```bash
sudo apt install libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static
sudo systemctl reload nginx
```

Verificar que está activo:
```bash
curl -H "Accept-Encoding: br" -I https://tmpmailio.com | grep content-encoding
# Debe devolver: content-encoding: br
```

---

## 2. Cache Headers para assets estáticos

Agregar dentro del bloque `server {}` de tmpmailio.com:

```nginx
# Assets de Next.js (_next/static) — inmutables, 1 año
location /_next/static/ {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header X-Cache-Status $upstream_cache_status;
}

# Imágenes, fuentes, íconos — 30 días
location ~* \.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|otf)$ {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "public, max-age=2592000, stale-while-revalidate=86400";
    add_header Vary "Accept-Encoding";
}

# Archivos de manifiesto y sitemap — 1 día
location ~* \.(xml|json|txt)$ {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "public, max-age=86400";
}
```

---

## 3. Security Headers (bonus SEO/confianza)

```nginx
# Dentro del bloque server {}
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

---

## 4. Rate Limiting

```nginx
# En bloque http {} de nginx.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;

# En el bloque server {} de tmpmailio.com
location /api/ {
    limit_req zone=api burst=10 nodelay;
    limit_req_status 429;
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 5. Aplicar cambios

```bash
# Verificar sintaxis
sudo nginx -t

# Recargar (sin downtime)
sudo systemctl reload nginx

# Verificar compresión activa
curl -H "Accept-Encoding: gzip" -I https://tmpmailio.com | grep content-encoding
# → content-encoding: gzip

# Verificar cache headers
curl -I https://tmpmailio.com/_next/static/chunks/main.js | grep cache-control
# → cache-control: public, max-age=31536000, immutable
```
