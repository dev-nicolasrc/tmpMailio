import { Router, Request, Response } from "express"
import { createMailboxLimiter } from "../middleware/rateLimiter"
import {
  createMailbox,
  deleteMailbox,
  getMailboxById,
  getMailboxToken,
} from "../services/mailboxService"
import { getEmailsByMailbox } from "../services/emailService"
import { registerMailboxExpiry } from "../services/cleanupService"
import { getDomains } from "../services/mailtmClient"
import { getIO } from "../server"

const router = Router()

// POST /api/mailbox/create
router.post("/create", createMailboxLimiter, async (req: Request, res: Response) => {
  try {
    // Get live domains from Mail.tm
    const available = await getDomains()
    if (available.length === 0) {
      res.status(503).json({ error: "No domains available" })
      return
    }

    // Use requested domain if valid, else pick first available
    const requestedDomain = req.body.domain as string | undefined
    const domain = available.find((d) => d.domain === requestedDomain)?.domain ?? available[0].domain

    const mailbox = await createMailbox(domain)
    await registerMailboxExpiry(mailbox.id, mailbox.expiresAt)
    res.status(201).json({ mailbox })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create mailbox"
    const status = message.includes("429") ? 429 : 400
    res.status(status).json({ error: message })
  }
})

// DELETE /api/mailbox/:id
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const mailbox = await getMailboxById(id)
    if (!mailbox) {
      res.status(404).json({ error: "Mailbox not found" })
      return
    }
    await deleteMailbox(id)
    getIO().to(id).emit("mailbox_deleted", { mailboxId: id })
    res.status(204).send()
  } catch (err) {
    console.error("[Mailbox] DELETE error:", err)
    res.status(500).json({ error: "Failed to delete mailbox" })
  }
})

// GET /api/mailbox/:id/emails
router.get("/:id/emails", async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const creds = await getMailboxToken(id)
    if (!creds) {
      res.status(404).json({ error: "Mailbox not found" })
      return
    }
    const emails = await getEmailsByMailbox(id, creds.token)
    res.json({ emails })
  } catch (err) {
    console.error("[Mailbox] GET emails error:", err)
    res.status(500).json({ error: "Failed to fetch emails" })
  }
})

export default router
