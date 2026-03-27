"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { getSocket } from "@/lib/socket"
import { useMailboxStore } from "@/store/mailboxStore"
import { sendNotification } from "@/lib/notifications"

export function useSocket() {
  const { mailbox, addIncomingEmail, setConnected, createMailbox, showToast } = useMailboxStore()
  const tToast = useTranslations("toast")
  const tNotif = useTranslations("notifications")

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
      const audio = new Audio("/sounds/notification.mp3")
      audio.volume = 0.4
      audio.play().catch(() => {})
      sendNotification("TmpMail", `De: ${email.from}`)
    })

    socket.on("mailbox_expired", ({ mailboxId }) => {
      if (mailboxId !== mailbox.id) return
      //createMailbox()
      //showToast(tToast("mailboxRenewed"))
      sendNotification("TmpMail", tNotif("renewed"))
    })

    socket.on("mailbox_deleted", ({ mailboxId }) => {
      if (mailboxId === mailbox.id) createMailbox().catch(() => {})
    })

    return () => {
      socket.emit("leave_mailbox", { mailboxId: mailbox.id })
      socket.off("new_email")
      socket.off("mailbox_expired")
      socket.off("mailbox_deleted")
    }
  }, [mailbox?.id, addIncomingEmail, createMailbox, showToast, tToast, tNotif])
}
