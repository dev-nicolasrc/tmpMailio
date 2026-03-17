"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { sendNotification } from "@/lib/notifications"

interface ExpirationTimerProps {
  expiresAt: Date
  onExpired?: () => void
}

export function ExpirationTimer({ expiresAt, onExpired }: ExpirationTimerProps) {
  const t = useTranslations("timer")
  const tNotif = useTranslations("notifications")
  const totalMs = 10 * 60 * 1000
  const [remaining, setRemaining] = useState(0)
  const warnedRef = useRef(false)

  // Reset warning flag when a new mailbox is set
  useEffect(() => {
    warnedRef.current = false
  }, [expiresAt])

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) {
        setRemaining(0)
        onExpired?.()
        return
      }
      setRemaining(ms)
      if (ms / 1000 <= 120 && !warnedRef.current) {
        warnedRef.current = true
        sendNotification("TmpMail", tNotif("expiringSoon"))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpired, tNotif])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const progress = Math.max(0, Math.min(1, remaining / totalMs))

  const accentColor =
    progress > 0.4 ? "var(--accent-primary)" :
    progress > 0.15 ? "#FFAA00" :
    "var(--danger)"

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2 font-mono text-[11px]"
      style={{
        border: `1px solid ${accentColor}`,
        borderLeft: `3px solid ${accentColor}`,
        color: accentColor,
        background: "var(--bg-secondary)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span className="uppercase tracking-wider" style={{ fontSize: "10px" }}>
        {remaining > 0
          ? `${t("expiresIn")} ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
          : t("expired")}
      </span>
    </div>
  )
}
