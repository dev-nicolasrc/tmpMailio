"use client"

import { useEffect } from "react"
import { useMailboxStore } from "@/store/mailboxStore"

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

async function createWithRetry(
  createMailbox: (domain?: string) => Promise<void>,
  domain?: string
) {
  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await createMailbox(domain)
      return
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
      }
    }
  }
  console.error("[useMailbox] Failed to create mailbox after retries")
}

export function useMailbox() {
  const store = useMailboxStore()

  // Auto-create mailbox on first load
  useEffect(() => {
    if (!store.mailbox) {
      fetch(`${API}/api/domains`)
        .then((r) => r.json())
        .then((data) => {
          const firstDomain = data.domains?.[0]?.domain
          return createWithRetry(store.createMailbox, firstDomain)
        })
        .catch(() => createWithRetry(store.createMailbox))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return store
}
