import dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") })

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  MONGO_URI: process.env.MONGO_URI ?? "mongodb://localhost:27017/tmpmail",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  DOMAINS: (process.env.DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean),
  MAILBOX_TTL: parseInt(process.env.MAILBOX_TTL ?? "600", 10),
  MAILBOX_TTL_EXTEND: parseInt(process.env.MAILBOX_TTL_EXTEND ?? "300", 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "3600000", 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? "10", 10),
  MAX_ATTACHMENT_SIZE: parseInt(process.env.MAX_ATTACHMENT_SIZE ?? "5242880", 10),
  UPLOADS_DIR: process.env.UPLOADS_DIR ?? path.resolve(__dirname, "../../uploads"),
}
