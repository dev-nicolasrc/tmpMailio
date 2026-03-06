"use client"

import { create } from "zustand"
import type { EmailHeader, Email, Mailbox } from "@tmpmail/shared"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface MailboxStore {
  mailbox: Mailbox | null
  emails: EmailHeader[]
  selectedEmail: Email | null
  isConnected: boolean
  isLoading: boolean

  createMailbox: (domain?: string) => Promise<void>
  deleteMailbox: () => Promise<void>
  selectEmail: (emailId: string) => Promise<void>
  clearSelectedEmail: () => void
  addIncomingEmail: (email: EmailHeader) => void
  setExpired: () => void
  setConnected: (connected: boolean) => void
  loadEmails: () => Promise<void>
}

export const useMailboxStore = create<MailboxStore>((set, get) => ({
  mailbox: null,
  emails: [],
  selectedEmail: null,
  isConnected: false,
  isLoading: false,

  createMailbox: async (domain?: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch(`${API}/api/mailbox/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      set({ mailbox: data.mailbox, emails: [], selectedEmail: null })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteMailbox: async () => {
    const { mailbox } = get()
    if (!mailbox) return
    await fetch(`${API}/api/mailbox/${mailbox.id}`, { method: "DELETE" })
    set({ mailbox: null, emails: [], selectedEmail: null })
  },

  selectEmail: async (emailId: string) => {
    const res = await fetch(`${API}/api/email/${emailId}`)
    const data = await res.json()
    if (res.ok) set({ selectedEmail: data.email })
  },

  clearSelectedEmail: () => set({ selectedEmail: null }),

  addIncomingEmail: (email: EmailHeader) => {
    set((state) => ({ emails: [email, ...state.emails] }))
  },

  setExpired: () => {
    set((state) => ({
      mailbox: state.mailbox
        ? { ...state.mailbox, status: "expired" }
        : null,
    }))
  },

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  loadEmails: async () => {
    const { mailbox } = get()
    if (!mailbox) return
    const res = await fetch(`${API}/api/mailbox/${mailbox.id}/emails`)
    const data = await res.json()
    if (res.ok) set({ emails: data.emails })
  },
}))
