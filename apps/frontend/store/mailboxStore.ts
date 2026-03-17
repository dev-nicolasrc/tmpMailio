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
  toastMessage: string | null

  createMailbox: (domain?: string) => Promise<void>
  deleteMailbox: () => Promise<void>
  selectEmail: (emailId: string) => Promise<void>
  clearSelectedEmail: () => void
  addIncomingEmail: (email: EmailHeader) => void
  setExpired: () => void
  setConnected: (connected: boolean) => void
  loadEmails: () => Promise<void>
  showToast: (message: string) => void
  clearToast: () => void
}

export const useMailboxStore = create<MailboxStore>((set, get) => ({
  mailbox: null,
  emails: [],
  selectedEmail: null,
  isConnected: false,
  isLoading: false,
  toastMessage: null,

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
    const { mailbox } = get()
    if (!mailbox) return
    const res = await fetch(`${API}/api/email/${mailbox.id}/${emailId}`)
    const data = await res.json()
    if (res.ok) set({ selectedEmail: { ...data.email, receivedAt: new Date(data.email.receivedAt) } })
  },

  clearSelectedEmail: () => set({ selectedEmail: null }),

  addIncomingEmail: (email: EmailHeader) => {
    const normalized = { ...email, receivedAt: new Date(email.receivedAt) }
    set((state) => ({ emails: [normalized, ...state.emails] }))
  },

  setExpired: () => {
    set((state) => ({
      mailbox: state.mailbox
        ? { ...state.mailbox, status: "expired" }
        : null,
    }))
  },

  setConnected: (connected: boolean) => set({ isConnected: connected }),

  showToast: (message: string) => {
    set({ toastMessage: message })
    setTimeout(() => set({ toastMessage: null }), 3000)
  },

  clearToast: () => set({ toastMessage: null }),

  loadEmails: async () => {
    const { mailbox } = get()
    if (!mailbox) return
    const res = await fetch(`${API}/api/mailbox/${mailbox.id}/emails`)
    const data = await res.json()
    if (res.ok) set({ emails: data.emails.map((e: EmailHeader) => ({ ...e, receivedAt: new Date(e.receivedAt) })) })
  },
}))
