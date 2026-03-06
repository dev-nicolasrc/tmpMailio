import { Server } from "socket.io"
import { redisSub } from "../config/redis"
import type { ClientToServerEvents, ServerToClientEvents } from "@tmpmail/shared"

export function initSocketEvents(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on("connection", (socket) => {
    socket.on("join_mailbox", ({ mailboxId }) => {
      socket.join(mailboxId)
    })

    socket.on("leave_mailbox", ({ mailboxId }) => {
      socket.leave(mailboxId)
    })
  })

  // Listen for Redis keyspace notifications (expired keys)
  redisSub.subscribe("__keyevent@0__:expired", (err) => {
    if (err) console.error("[Redis] Keyspace subscription error:", err)
  })

  redisSub.on("message", (_channel, key) => {
    if (key.startsWith("mailbox:")) {
      const mailboxId = key.replace("mailbox:", "")
      io.to(mailboxId).emit("mailbox_expired", { mailboxId })
    }
  })

  console.log("[Socket.io] Events initialized")
}
