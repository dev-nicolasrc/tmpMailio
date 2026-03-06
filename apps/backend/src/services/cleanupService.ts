import cron from "node-cron"
import { MailboxModel } from "../models/Mailbox"
import { EmailModel } from "../models/Email"

export function startCleanupJob(): void {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    const now = new Date()
    try {
      // Mark expired mailboxes
      const expired = await MailboxModel.find({
        expiresAt: { $lt: now },
        status: "active",
      }).select("mailboxId")

      if (expired.length > 0) {
        const ids = expired.map((m) => m.mailboxId)
        await MailboxModel.updateMany({ mailboxId: { $in: ids } }, { status: "expired" })
        // Remove emails older than 1 hour to keep storage lean
        const cutoff = new Date(now.getTime() - 60 * 60 * 1000)
        await EmailModel.deleteMany({ mailboxId: { $in: ids }, receivedAt: { $lt: cutoff } })
        console.log(`[Cleanup] Expired ${ids.length} mailboxes`)
      }
    } catch (err) {
      console.error("[Cleanup] Error:", err)
    }
  })

  console.log("[Cleanup] Cron job started (every 5 min)")
}
