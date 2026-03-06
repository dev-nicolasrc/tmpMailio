import { Router, Request, Response } from "express"
import { getEmailById } from "../services/emailService"

const router = Router()

// GET /api/email/:emailId
router.get("/:emailId", async (req: Request, res: Response) => {
  const { emailId } = req.params
  const email = await getEmailById(emailId)
  if (!email) {
    res.status(404).json({ error: "Email not found" })
    return
  }
  res.json({ email })
})

export default router
