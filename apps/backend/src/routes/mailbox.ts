import { Router, Request, Response } from "express"
import { createMailboxLimiter } from "../middleware/rateLimiter"
import {
  createMailbox,
  deleteMailbox,
  getMailboxById,
} from "../services/mailboxService"
import { getEmailsByMailbox } from "../services/emailService"
import { env } from "../config/env"
import { getIO } from "../server"

const router = Router()

// POST /api/mailbox/create
router.post("/create", createMailboxLimiter, async (req: Request, res: Response) => {
  try {
    const domain = req.body.domain ?? env.DOMAINS[0]
    if (!domain) {
      res.status(400).json({ error: "No domains configured" })
      return
    }
    const mailbox = await createMailbox(domain)
    res.status(201).json({ mailbox })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create mailbox"
    res.status(400).json({ error: message })
  }
})

// DELETE /api/mailbox/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params
  const mailbox = await getMailboxById(id)
  if (!mailbox) {
    res.status(404).json({ error: "Mailbox not found" })
    return
  }
  await deleteMailbox(id)
  getIO().to(id).emit("mailbox_deleted", { mailboxId: id })
  res.status(204).send()
})

// GET /api/mailbox/:id/emails
router.get("/:id/emails", async (req: Request, res: Response) => {
  const { id } = req.params
  const mailbox = await getMailboxById(id)
  if (!mailbox) {
    res.status(404).json({ error: "Mailbox not found" })
    return
  }
  const emails = await getEmailsByMailbox(id)
  res.json({ emails })
})

export default router
