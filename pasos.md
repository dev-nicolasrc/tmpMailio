# Guía de Despliegue — TmpMailio

## Paso 1 — Push del código a GitHub

Desde tu máquina local:

```bash
cd "D:/Documents/My Data/Projects/OnePages/TmpMail"
git remote add origin https://github.com/dev-nicolasrc/tmpMailio.git
git branch -M main
git push -u origin main
```

---

## Paso 2 — Conectarte al VPS

```bash
ssh root@187.77.234.184
```

---

## Paso 3 — Setup inicial del VPS

Ejecutar en orden:

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verificar
node -v && npm -v

# Instalar Redis
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping  # debe responder PONG

# Instalar MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl enable mongod
systemctl start mongod
mongosh --eval "db.adminCommand({ ping: 1 })"  # debe responder ok: 1

# Instalar PM2 y Git
npm install -g pm2
apt install -y git
```

---

## Paso 4 — Clonar y configurar el proyecto

```bash
# Clonar repo
git clone https://github.com/dev-nicolasrc/tmpMailio.git /app
cd /app

# Crear .env
cp .env.example .env
nano .env
```

Editar `.env` con estos valores mínimos para empezar:

```env
REDIS_URL=redis://localhost:6379
MONGO_URI=mongodb://localhost:27017/tmpmail
PORT=4000
DOMAINS=tmpmailio.com        # tu dominio real cuando lo tengas
CORS_ORIGIN=http://187.77.234.184:3000
NEXT_PUBLIC_API_URL=http://187.77.234.184:4000
NEXT_PUBLIC_SOCKET_URL=http://187.77.234.184:4000
NODE_ENV=production
```

---

## Paso 5 — Instalar dependencias y buildear

```bash
cd /app
npm install

# Build shared primero
npm run build --workspace=packages/shared

# Build backend
npm run build --workspace=apps/backend

# Build frontend
npm run build --workspace=apps/frontend
```

---

## Paso 6 — Levantar con PM2

Crear el archivo de configuración:

```bash
cat > /app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "/app/apps/frontend",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" }
    },
    {
      name: "backend",
      cwd: "/app/apps/backend",
      script: "dist/server.js",
      env: { NODE_ENV: "production" }
    }
  ]
}
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup  # ejecutar el comando que te muestre para auto-start
```

---

## Paso 7 — Verificar que todo funciona

```bash
# Ver estado de procesos
pm2 status

# Ver logs en tiempo real
pm2 logs

# Probar backend
curl http://localhost:4000/health
# Debe responder: {"status":"ok"}

# Probar que el frontend responde
curl -I http://localhost:3000
```

---

## Paso 8 — Abrir firewall para pruebas

```bash
ufw allow 22    # SSH
ufw allow 3000  # Frontend (temporal para pruebas)
ufw allow 4000  # Backend (temporal para pruebas)
ufw enable
```

Luego abre en tu navegador: `http://187.77.234.184:3000`

---

> Cuando el dominio esté apuntando al VPS configuramos **Nginx + SSL** y cerramos los puertos directos.
