export interface EmailAttachment {
  filename: string
  contentType: string
  size: number
  url: string
}

export interface EmailHeader {
  id: string
  mailboxId: string
  from: string
  subject: string
  receivedAt: Date
  hasAttachments: boolean
}

export interface Email extends EmailHeader {
  html: string | null
  text: string | null
  attachments: EmailAttachment[]
}
