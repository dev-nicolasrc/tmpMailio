import express from "express"
import http from "http"
import { Server } from "socket.io"
import helmet from "helmet"
import cors from "cors"
import { env } from "./config/env"
import { connectRedis } from "./config/redis"
import { connectMongo } from "./config/mongo"
import { initSocketEvents } from "./socket/emailEvents"
import { startCleanupJob } from "./services/cleanupService"
import mailboxRouter from "./routes/mailbox"
import emailsRouter from "./routes/emails"
import domainsRouter from "./routes/domains"
import type { ClientToServerEvents, ServerToClientEvents } from "@tmpmail/shared"

const app = express()
const httpServer = http.createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: env.CORS_ORIGIN, methods: ["GET", "POST"] },
})

// Export io so routes can emit events
let _io: typeof io
export function getIO(): typeof io {
  return _io
}

// Middleware
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json())
app.set("trust proxy", 1)

// Static uploads (attachments)
app.use("/uploads", express.static(env.UPLOADS_DIR))

// Routes
app.use("/api/mailbox", mailboxRouter)
app.use("/api/email", emailsRouter)
app.use("/api/domains", domainsRouter)

// Internal endpoint for mail-receiver script
app.post("/internal/new-email", (req, res) => {
  const { mailboxId, email } = req.body
  if (mailboxId && email) {
    io.to(mailboxId).emit("new_email", { email })
  }
  res.status(204).send()
})

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }))

async function bootstrap(): Promise<void> {
  await connectRedis()
  await connectMongo()

  _io = io
  initSocketEvents(io)
  startCleanupJob()

  httpServer.listen(env.PORT, () => {
    console.log(`[Server] Running on port ${env.PORT} (${env.NODE_ENV})`)
  })
}

bootstrap().catch((err) => {
  console.error("[Server] Fatal error:", err)
  process.exit(1)
})
