export type MailboxStatus = "active" | "expired" | "deleted"

export interface Mailbox {
  id: string
  address: string
  domain: string
  createdAt: Date
  expiresAt: Date
  status: MailboxStatus
}

export interface CreateMailboxResponse {
  mailbox: Mailbox
}
