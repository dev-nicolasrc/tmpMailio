import { randomBytes } from "crypto"
import { redis } from "../config/redis"
import { MailboxModel } from "../models/Mailbox"
import { env } from "../config/env"
import type { Mailbox } from "@tmpmail/shared"

function randomUsername(): string {
  const adjectives = ["swift", "calm", "bright", "cool", "dark", "fast", "bold", "keen"]
  const nouns = ["fox", "wave", "star", "mist", "leaf", "rock", "flame", "cloud"]
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 9000) + 1000
  return `${adj}.${noun}.${num}`
}

export async function createMailbox(domain: string): Promise<Mailbox> {
  if (!env.DOMAINS.includes(domain)) {
    throw new Error(`Invalid domain: ${domain}`)
  }

  const mailboxId = randomBytes(12).toString("hex")
  const username = randomUsername()
  const address = `${username}@${domain}`
  const now = new Date()
  const expiresAt = new Date(now.getTime() + env.MAILBOX_TTL * 1000)

  // Store in Redis with TTL (source of truth for active mailboxes)
  await redis.hset(`mailbox:${mailboxId}`, {
    address,
    domain,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })
  await redis.expire(`mailbox:${mailboxId}`, env.MAILBOX_TTL)
  // Reverse lookup: address -> mailboxId (used by mail-receiver)
  await redis.set(`address:${address.toLowerCase()}`, mailboxId, "EX", env.MAILBOX_TTL)

  // Persist to MongoDB for logs
  await MailboxModel.create({ mailboxId, address, domain, createdAt: now, expiresAt, status: "active" })

  return { id: mailboxId, address, domain, createdAt: now, expiresAt, status: "active" }
}

export async function deleteMailbox(mailboxId: string): Promise<void> {
  const data = await redis.hgetall(`mailbox:${mailboxId}`)
  await redis.del(`mailbox:${mailboxId}`)
  if (data?.address) {
    await redis.del(`address:${data.address.toLowerCase()}`)
  }
  await MailboxModel.updateOne({ mailboxId }, { status: "deleted" })
}

export async function extendMailboxTTL(mailboxId: string): Promise<void> {
  const ttl = await redis.ttl(`mailbox:${mailboxId}`)
  if (ttl <= 0) return
  const newTTL = ttl + env.MAILBOX_TTL_EXTEND
  await redis.expire(`mailbox:${mailboxId}`, newTTL)
  const newExpiresAt = new Date(Date.now() + newTTL * 1000)
  await MailboxModel.updateOne({ mailboxId }, { expiresAt: newExpiresAt })
}

export async function getMailboxById(mailboxId: string): Promise<Mailbox | null> {
  const data = await redis.hgetall(`mailbox:${mailboxId}`)
  if (!data || !data.address) return null
  const ttl = await redis.ttl(`mailbox:${mailboxId}`)
  return {
    id: mailboxId,
    address: data.address,
    domain: data.domain,
    createdAt: new Date(data.createdAt),
    expiresAt: new Date(Date.now() + ttl * 1000),
    status: "active",
  }
}
