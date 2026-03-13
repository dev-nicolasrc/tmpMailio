import { randomBytes } from "crypto"
import { redis } from "../config/redis"
import { env } from "../config/env"
import { createAccount, getToken, deleteAccount } from "./mailtmClient"
import type { Mailbox } from "@tmpmail/shared"

// Password for Mail.tm accounts — random per mailbox, stored in Redis
function randomPassword(): string {
  return randomBytes(16).toString("hex")
}

// Redis key structure:
//   mailbox:{id}  →  hash { address, domain, mailtmAccountId, mailtmToken, createdAt, expiresAt }
//   knownMsgIds:{id}  →  set of already-seen Mail.tm message IDs

export async function createMailbox(domain: string): Promise<Mailbox> {
  // Accept any domain from Mail.tm (validated upstream via getDomains)
  const username = `user${randomBytes(5).toString("hex")}`
  const address = `${username}@${domain}`
  const password = randomPassword()

  // Create account on Mail.tm
  const account = await createAccount(address, password)
  const token = await getToken(address, password)

  const mailboxId = randomBytes(12).toString("hex")
  const now = new Date()
  const expiresAt = new Date(now.getTime() + env.MAILBOX_TTL * 1000)

  await redis.hset(`mailbox:${mailboxId}`, {
    address,
    domain,
    mailtmAccountId: account.id,
    mailtmToken: token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  })
  await redis.expire(`mailbox:${mailboxId}`, env.MAILBOX_TTL)

  return { id: mailboxId, address, domain, createdAt: now, expiresAt, status: "active" }
}

export async function deleteMailbox(mailboxId: string): Promise<void> {
  const data = await redis.hgetall(`mailbox:${mailboxId}`)
  if (!data?.mailtmAccountId) return

  // Delete Mail.tm account (best effort)
  try {
    await deleteAccount(data.mailtmAccountId, data.mailtmToken)
  } catch (err) {
    console.warn(`[Mailbox] Could not delete Mail.tm account ${data.mailtmAccountId}:`, err)
  }

  await redis.del(`mailbox:${mailboxId}`)
  await redis.del(`knownMsgIds:${mailboxId}`)
}

export async function getMailboxById(mailboxId: string): Promise<Mailbox | null> {
  const data = await redis.hgetall(`mailbox:${mailboxId}`)
  if (!data?.address) return null

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

export async function getMailboxToken(mailboxId: string): Promise<{ token: string; mailtmAccountId: string } | null> {
  const data = await redis.hgetall(`mailbox:${mailboxId}`)
  if (!data?.mailtmToken) return null
  return { token: data.mailtmToken, mailtmAccountId: data.mailtmAccountId }
}

export async function getKnownMessageIds(mailboxId: string): Promise<Set<string>> {
  const ids = await redis.smembers(`knownMsgIds:${mailboxId}`)
  return new Set(ids)
}

export async function addKnownMessageId(mailboxId: string, messageId: string): Promise<void> {
  const ttl = await redis.ttl(`mailbox:${mailboxId}`)
  await redis.sadd(`knownMsgIds:${mailboxId}`, messageId)
  if (ttl > 0) await redis.expire(`knownMsgIds:${mailboxId}`, ttl)
}
