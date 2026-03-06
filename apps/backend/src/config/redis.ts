import Redis from "ioredis"
import { env } from "./env"

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
})

// Separate subscriber client for keyspace notifications (cannot share with main client)
export const redisSub = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
})

export async function connectRedis(): Promise<void> {
  await redis.connect()
  await redisSub.connect()
  // Enable keyspace notifications for expired events
  await redis.config("SET", "notify-keyspace-events", "Ex")
  console.log("[Redis] Connected")
}
