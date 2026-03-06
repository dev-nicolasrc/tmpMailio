import mongoose from "mongoose"
import { env } from "./env"

export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.MONGO_URI)
  console.log("[MongoDB] Connected")
}
