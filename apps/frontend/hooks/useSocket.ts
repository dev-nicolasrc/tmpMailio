"use client"

import { useEffect } from "react"
import { getSocket } from "@/lib/socket"
import { useMailboxStore } from "@/store/mailboxStore"

export function useSocket() {
  const { mailbox, addIncomingEmail, setExpired, setConnected } = useMailboxStore()

  useEffect(() => {
    const socket = getSocket()

    if (!socket.connected) socket.connect()

    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))

    return () => {
      socket.off("connect")
      socket.off("disconnect")
    }
  }, [setConnected])

  useEffect(() => {
    const socket = getSocket()
    if (!mailbox?.id) return

    socket.emit("join_mailbox", { mailboxId: mailbox.id })

    socket.on("new_email", ({ email }) => {
      addIncomingEmail(email)
      // Play notification sound
      const audio = new Audio("/sounds/notification.mp3")
      audio.volume = 0.4
      audio.play().catch(() => {})
      // Browser notification
      if (Notification.permission === "granted") {
        new Notification("TmpMail — Nuevo correo", {
          body: `De: ${email.from}`,
          icon: "/icons/icon-192.png",
        })
      }
    })

    socket.on("mailbox_expired", ({ mailboxId }) => {
      if (mailboxId === mailbox.id) setExpired()
    })

    socket.on("mailbox_deleted", ({ mailboxId }) => {
      if (mailboxId === mailbox.id) setExpired()
    })

    return () => {
      socket.emit("leave_mailbox", { mailboxId: mailbox.id })
      socket.off("new_email")
      socket.off("mailbox_expired")
      socket.off("mailbox_deleted")
    }
  }, [mailbox?.id, addIncomingEmail, setExpired])
}
