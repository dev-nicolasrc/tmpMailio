import mongoose, { Schema, Document } from "mongoose"
import type { EmailAttachment } from "@tmpmail/shared"

export interface IEmail extends Document {
  emailId: string
  mailboxId: string
  from: string
  subject: string
  html: string | null
  text: string | null
  attachments: EmailAttachment[]
  hasAttachments: boolean
  receivedAt: Date
}

const AttachmentSchema = new Schema<EmailAttachment>(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
)

const EmailSchema = new Schema<IEmail>(
  {
    emailId: { type: String, required: true, unique: true, index: true },
    mailboxId: { type: String, required: true, index: true },
    from: { type: String, required: true },
    subject: { type: String, default: "(sin asunto)" },
    html: { type: String, default: null },
    text: { type: String, default: null },
    attachments: { type: [AttachmentSchema], default: [] },
    hasAttachments: { type: Boolean, default: false },
    receivedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
)

export const EmailModel = mongoose.model<IEmail>("Email", EmailSchema)
