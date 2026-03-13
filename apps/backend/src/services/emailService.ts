import { getMessages, getMessageById } from "./mailtmClient"
import type { Email, EmailHeader } from "@tmpmail/shared"

function toEmailHeader(msg: Awaited<ReturnType<typeof getMessages>>[number], mailboxId: string): EmailHeader {
  return {
    id: msg.id,
    mailboxId,
    from: msg.from.name ? `${msg.from.name} <${msg.from.address}>` : msg.from.address,
    subject: msg.subject || "(Sin asunto)",
    receivedAt: new Date(msg.createdAt),
    hasAttachments: msg.hasAttachments,
  }
}

export async function getEmailsByMailbox(mailboxId: string, token: string): Promise<EmailHeader[]> {
  const messages = await getMessages(token)
  return messages.map((m) => toEmailHeader(m, mailboxId))
}

export async function getEmailById(emailId: string, token: string): Promise<Email | null> {
  try {
    const msg = await getMessageById(emailId, token)
    return {
      id: msg.id,
      mailboxId: "", // not needed by frontend
      from: msg.from.name ? `${msg.from.name} <${msg.from.address}>` : msg.from.address,
      subject: msg.subject || "(Sin asunto)",
      receivedAt: new Date(msg.createdAt),
      hasAttachments: msg.hasAttachments,
      html: msg.html?.[0] ?? null,
      text: msg.text ?? null,
      attachments: (msg.attachments ?? []).map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        url: `https://api.mail.tm${a.downloadUrl}`,
      })),
    }
  } catch {
    return null
  }
}
