"use client"

import { useEffect } from "react"
import { useMailboxStore } from "@/store/mailboxStore"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function useMailbox() {
  const store = useMailboxStore()

  // Auto-create mailbox on first load
  useEffect(() => {
    if (!store.mailbox) {
      fetch(`${API}/api/domains`)
        .then((r) => r.json())
        .then((data) => {
          const firstDomain = data.domains?.[0]?.domain
          store.createMailbox(firstDomain)
        })
        .catch(() => store.createMailbox())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return store
}
