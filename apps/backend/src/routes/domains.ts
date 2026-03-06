import { Router, Request, Response } from "express"
import { env } from "../config/env"

const router = Router()

// GET /api/domains
router.get("/", (_req: Request, res: Response) => {
  const domains = env.DOMAINS.map((domain) => ({ domain, label: domain }))
  res.json({ domains })
})

export default router
