"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import type { EmailHeader } from "@tmpmail/shared"

interface EmailCardProps {
  email: EmailHeader
  onOpen: (id: string) => void
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `Hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `Hace ${m}m`
  return `Hace ${Math.floor(m / 60)}h`
}

export function EmailCard({ email, onOpen }: EmailCardProps) {
  const t = useTranslations("inbox")

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="card card-hover p-4 flex items-start gap-3 cursor-pointer transition-all"
      onClick={() => onOpen(email.id)}
    >
      <span className="mt-1 w-2 h-2 rounded-full bg-success flex-shrink-0 shadow-glow-success" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary truncate">
          {t("from")} <span className="text-accent-secondary">{email.from}</span>
        </p>
        <p className="text-sm font-semibold text-text-primary truncate mt-0.5">{email.subject}</p>
        <p className="text-xs text-text-secondary mt-1">{timeAgo(email.receivedAt)}</p>
      </div>
      <button
        className="text-xs px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary hover:text-white transition-all flex-shrink-0"
        onClick={(e) => { e.stopPropagation(); onOpen(email.id) }}
      >
        {t("open")}
      </button>
    </motion.div>
  )
}
