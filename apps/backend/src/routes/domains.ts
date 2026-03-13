import { Router, Request, Response } from "express"
import { getDomains } from "../services/mailtmClient"

const router = Router()

// GET /api/domains — returns live domains from Mail.tm
router.get("/", async (_req: Request, res: Response) => {
  try {
    const available = await getDomains()
    const domains = available.map((d) => ({ domain: d.domain, label: d.domain }))
    res.json({ domains })
  } catch {
    res.status(503).json({ error: "Could not fetch domains" })
  }
})

export default router
