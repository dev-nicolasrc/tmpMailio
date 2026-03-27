import { Router, Request, Response } from "express"
import { getEmailById } from "../services/emailService"
import { getMailboxToken } from "../services/mailboxService"

const router = Router()

// GET /api/email/:mailboxId/:emailId
// The frontend needs both IDs: mailboxId to get the token, emailId to fetch from Mail.tm
router.get("/:mailboxId/:emailId", async (req: Request, res: Response) => {
  try {
    const { mailboxId, emailId } = req.params
    const creds = await getMailboxToken(mailboxId)
    if (!creds) {
      res.status(404).json({ error: "Mailbox not found" })
      return
    }
    const email = await getEmailById(emailId, creds.token)
    if (!email) {
      res.status(404).json({ error: "Email not found" })
      return
    }
    res.json({ email })
  } catch (err) {
    console.error("[Email] GET error:", err)
    res.status(500).json({ error: "Failed to fetch email" })
  }
})

export default router
