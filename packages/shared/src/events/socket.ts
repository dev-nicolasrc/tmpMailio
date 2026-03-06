import type { Email } from "../types/email"

// Client -> Server
export interface ClientToServerEvents {
  join_mailbox: (payload: { mailboxId: string }) => void
  leave_mailbox: (payload: { mailboxId: string }) => void
}

// Server -> Client
export interface ServerToClientEvents {
  new_email: (payload: { email: Email }) => void
  mailbox_expired: (payload: { mailboxId: string }) => void
  mailbox_deleted: (payload: { mailboxId: string }) => void
}
