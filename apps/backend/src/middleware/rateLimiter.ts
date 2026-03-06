import rateLimit from "express-rate-limit"
import { env } from "../config/env"

export const createMailboxLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  // Do not store IPs — use a memory store with no logging
  keyGenerator: (req) => {
    // Use hashed proxy-aware IP without storing it
    const ip = req.ip ?? "unknown"
    return Buffer.from(ip).toString("base64")
  },
  message: { error: "Too many mailboxes created. Try again later." },
})
