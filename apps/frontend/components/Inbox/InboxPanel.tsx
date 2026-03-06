"use client"

import { AnimatePresence } from "framer-motion"
import { Bell, BellOff } from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { EmailCard } from "./EmailCard"
import { SkeletonLoader } from "./SkeletonLoader"
import type { EmailHeader } from "@tmpmail/shared"

interface InboxPanelProps {
  emails: EmailHeader[]
  onOpen: (id: string) => void
}

export function InboxPanel({ emails, onOpen }: InboxPanelProps) {
  const t = useTranslations("inbox")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const perm = await Notification.requestPermission()
      setNotificationsEnabled(perm === "granted")
    } else {
      setNotificationsEnabled(false)
    }
  }

  return (
    <section className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-bold text-text-primary">{t("title")}</h2>
        <button
          onClick={toggleNotifications}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-all"
          title={t("notifications")}
        >
          {notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
          {t("notifications")}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {emails.length === 0 ? (
          <SkeletonLoader />
        ) : (
          <AnimatePresence initial={false}>
            {emails.map((email) => (
              <EmailCard key={email.id} email={email} onOpen={onOpen} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  )
}
