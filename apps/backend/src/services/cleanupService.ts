import cron from "node-cron"
import { redis } from "../config/redis"
import { deleteMailbox } from "./mailboxService"

export function startCleanupJob(): void {
  // Every 5 minutes: find mailboxes whose TTL has expired in Redis
  // (Redis already auto-deletes the keys, but we need to clean up Mail.tm accounts)
  // We track expiring mailboxes via a separate sorted set: expiring:{timestamp} → mailboxId
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = Date.now()
      // Get all expired mailbox IDs from the expiry index
      const expired = await redis.zrangebyscore("mailbox:expiry_index", 0, now)

      if (expired.length > 0) {
        for (const mailboxId of expired) {
          await deleteMailbox(mailboxId)
        }
        await redis.zremrangebyscore("mailbox:expiry_index", 0, now)
        console.log(`[Cleanup] Removed ${expired.length} expired mailboxes`)
      }
    } catch (err) {
      console.error("[Cleanup] Error:", err)
    }
  })

  console.log("[Cleanup] Cron job started (every 5 min)")
}

export async function registerMailboxExpiry(mailboxId: string, expiresAt: Date): Promise<void> {
  await redis.zadd("mailbox:expiry_index", expiresAt.getTime(), mailboxId)
}
