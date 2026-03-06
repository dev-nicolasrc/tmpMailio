/**
 * mail-receiver.ts
 *
 * Postfix pipes incoming SMTP messages to this script via stdin.
 * It parses the email, saves it to MongoDB, updates Redis TTL,
 * and emits a Socket.io event to the mailbox room.
 *
 * Postfix config (master.cf):
 *   tmpmail unix - n n - - pipe flags=Rq user=www-data
 *     argv=/usr/bin/node /app/dist/mail-receiver.js ${recipient}
 */

import { simpleParser } from "mailparser"
import { connect as mongoConnect } from "mongoose"
import Redis from "ioredis"
import path from "path"
import fs from "fs"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, "../../.env") })

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017/tmpmail"
const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000"
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(__dirname, "../uploads")
const MAX_ATTACHMENT_SIZE = parseInt(process.env.MAX_ATTACHMENT_SIZE ?? "5242880", 10)
const MAILBOX_TTL_EXTEND = parseInt(process.env.MAILBOX_TTL_EXTEND ?? "300", 10)

async function main(): Promise<void> {
  // Read raw email from stdin (piped by Postfix)
  const rawEmail = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    process.stdin.on("data", (chunk) => chunks.push(chunk))
    process.stdin.on("end", () => resolve(Buffer.concat(chunks)))
    process.stdin.on("error", reject)
  })

  const parsed = await simpleParser(rawEmail)
  const to = parsed.to
  if (!to) process.exit(0)

  // Extract recipient address (could be array)
  const recipient = Array.isArray(to) ? to[0]?.text : to.text
  if (!recipient) process.exit(0)

  // Derive mailboxId from address via Redis lookup
  const redis = new Redis(REDIS_URL)
  const mailboxId = await redis.get(`address:${recipient.toLowerCase()}`)
  if (!mailboxId) {
    // No active mailbox for this address
    await redis.quit()
    process.exit(0)
  }

  // Connect to MongoDB
  await mongoConnect(MONGO_URI)
  const { EmailModel } = await import("./models/Email")

  // Handle attachments
  const { randomBytes } = await import("crypto")
  const attachments = []
  for (const att of parsed.attachments ?? []) {
    if (att.size > MAX_ATTACHMENT_SIZE) continue
    const filename = `${randomBytes(8).toString("hex")}-${att.filename ?? "attachment"}`
    const filepath = path.join(UPLOADS_DIR, filename)
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    fs.writeFileSync(filepath, att.content)
    attachments.push({
      filename: att.filename ?? "attachment",
      contentType: att.contentType,
      size: att.size,
      url: `/uploads/${filename}`,
    })
  }

  // Save email to MongoDB
  const emailId = randomBytes(16).toString("hex")
  const emailDoc = await EmailModel.create({
    emailId,
    mailboxId,
    from: parsed.from?.text ?? "unknown",
    subject: parsed.subject ?? "(sin asunto)",
    html: parsed.html || null,
    text: parsed.text ?? null,
    attachments,
    hasAttachments: attachments.length > 0,
    receivedAt: new Date(),
  })

  // Extend mailbox TTL in Redis
  const ttl = await redis.ttl(`mailbox:${mailboxId}`)
  if (ttl > 0) {
    await redis.expire(`mailbox:${mailboxId}`, ttl + MAILBOX_TTL_EXTEND)
  }

  // Notify Socket.io server via HTTP (avoids direct Socket.io dependency)
  const { default: fetch } = await import("node-fetch" as string as never) as { default: typeof globalThis.fetch }
  await fetch(`${SOCKET_SERVER_URL}/internal/new-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mailboxId,
      email: {
        id: emailDoc.emailId,
        mailboxId,
        from: emailDoc.from,
        subject: emailDoc.subject,
        receivedAt: emailDoc.receivedAt,
        hasAttachments: emailDoc.hasAttachments,
        html: emailDoc.html,
        text: emailDoc.text,
        attachments: emailDoc.attachments,
      },
    }),
  }).catch(() => {
    // Non-fatal: email is saved, notification will be seen on next poll
    console.error("[mail-receiver] Could not notify socket server")
  })

  await redis.quit()
  process.exit(0)
}

main().catch((err) => {
  console.error("[mail-receiver] Fatal:", err)
  process.exit(1)
})
