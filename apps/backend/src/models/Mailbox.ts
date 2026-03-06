import mongoose, { Schema, Document } from "mongoose"
import type { MailboxStatus } from "@tmpmail/shared"

export interface IMailbox extends Document {
  mailboxId: string
  address: string
  domain: string
  createdAt: Date
  expiresAt: Date
  status: MailboxStatus
}

const MailboxSchema = new Schema<IMailbox>(
  {
    mailboxId: { type: String, required: true, unique: true, index: true },
    address: { type: String, required: true, unique: true },
    domain: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["active", "expired", "deleted"], default: "active" },
  },
  { versionKey: false }
)

export const MailboxModel = mongoose.model<IMailbox>("Mailbox", MailboxSchema)
