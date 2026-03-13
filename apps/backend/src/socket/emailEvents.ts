import { Server, Socket } from "socket.io"
import { redis } from "../config/redis"
import { getMailboxToken, getKnownMessageIds, addKnownMessageId } from "../services/mailboxService"
import { getMessages } from "../services/mailtmClient"
import type { ClientToServerEvents, ServerToClientEvents } from "@tmpmail/shared"
import type { EmailHeader } from "@tmpmail/shared"

const POLL_INTERVAL_MS = 5000 // poll Mail.tm every 5 seconds per active mailbox

// Track active polling intervals per mailboxId
const pollers = new Map<string, ReturnType<typeof setInterval>>()

async function pollMailbox(
  mailboxId: string,
  io: Server<ClientToServerEvents, ServerToClientEvents>
): Promise<void> {
  const creds = await getMailboxToken(mailboxId)
  if (!creds) {
    stopPoller(mailboxId)
    io.to(mailboxId).emit("mailbox_expired", { mailboxId })
    return
  }

  const ttl = await redis.ttl(`mailbox:${mailboxId}`)
  if (ttl <= 0) {
    stopPoller(mailboxId)
    io.to(mailboxId).emit("mailbox_expired", { mailboxId })
    return
  }

  try {
    const messages = await getMessages(creds.token)
    const known = await getKnownMessageIds(mailboxId)

    for (const msg of messages) {
      if (!known.has(msg.id)) {
        await addKnownMessageId(mailboxId, msg.id)
        const email: EmailHeader = {
          id: msg.id,
          mailboxId,
          from: msg.from.name ? `${msg.from.name} <${msg.from.address}>` : msg.from.address,
          subject: msg.subject || "(Sin asunto)",
          receivedAt: new Date(msg.createdAt),
          hasAttachments: msg.hasAttachments,
        }
        io.to(mailboxId).emit("new_email", { email })
      }
    }
  } catch (err) {
    console.error(`[Poll] Error polling mailbox ${mailboxId}:`, err)
  }
}

function startPoller(
  mailboxId: string,
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  if (pollers.has(mailboxId)) return
  const interval = setInterval(() => pollMailbox(mailboxId, io), POLL_INTERVAL_MS)
  pollers.set(mailboxId, interval)
}

function stopPoller(mailboxId: string): void {
  const interval = pollers.get(mailboxId)
  if (interval) {
    clearInterval(interval)
    pollers.delete(mailboxId)
  }
}

export function initSocketEvents(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    socket.on("join_mailbox", ({ mailboxId }) => {
      socket.join(mailboxId)
      startPoller(mailboxId, io)
    })

    socket.on("leave_mailbox", ({ mailboxId }) => {
      socket.leave(mailboxId)
      // Stop polling if no clients are left in the room
      const room = io.sockets.adapter.rooms.get(mailboxId)
      if (!room || room.size === 0) {
        stopPoller(mailboxId)
      }
    })

    socket.on("disconnect", () => {
      // Clean up pollers for rooms this socket was in
      for (const [mailboxId] of pollers) {
        const room = io.sockets.adapter.rooms.get(mailboxId)
        if (!room || room.size === 0) {
          stopPoller(mailboxId)
        }
      }
    })
  })

  console.log("[Socket.io] Events initialized")
}
