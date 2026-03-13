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

let _io: typeof io
export function getIO(): typeof io {
  return _io
}

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json())
app.set("trust proxy", 1)

app.use("/api/mailbox", mailboxRouter)
app.use("/api/email", emailsRouter)
app.use("/api/domains", domainsRouter)

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
