import { randomBytes } from "crypto"
import { EmailModel } from "../models/Email"
import type { Email, EmailHeader } from "@tmpmail/shared"

function toEmailHeader(doc: InstanceType<typeof EmailModel>): EmailHeader {
  return {
    id: doc.emailId,
    mailboxId: doc.mailboxId,
    from: doc.from,
    subject: doc.subject,
    receivedAt: doc.receivedAt,
    hasAttachments: doc.hasAttachments,
  }
}

function toEmail(doc: InstanceType<typeof EmailModel>): Email {
  return {
    ...toEmailHeader(doc),
    html: doc.html,
    text: doc.text,
    attachments: doc.attachments,
  }
}

export async function saveEmail(data: {
  mailboxId: string
  from: string
  subject: string
  html: string | null
  text: string | null
  attachments: Email["attachments"]
}): Promise<Email> {
  const emailId = randomBytes(16).toString("hex")
  const doc = await EmailModel.create({
    emailId,
    ...data,
    hasAttachments: data.attachments.length > 0,
    receivedAt: new Date(),
  })
  return toEmail(doc)
}

export async function getEmailsByMailbox(mailboxId: string): Promise<EmailHeader[]> {
  const docs = await EmailModel.find({ mailboxId }).sort({ receivedAt: -1 }).limit(50).lean()
  return docs.map((doc) => ({
    id: doc.emailId,
    mailboxId: doc.mailboxId,
    from: doc.from,
    subject: doc.subject,
    receivedAt: doc.receivedAt,
    hasAttachments: doc.hasAttachments,
  }))
}

export async function getEmailById(emailId: string): Promise<Email | null> {
  const doc = await EmailModel.findOne({ emailId })
  if (!doc) return null
  return toEmail(doc)
}
