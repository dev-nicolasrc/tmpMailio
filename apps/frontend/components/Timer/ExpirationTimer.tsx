"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

interface ExpirationTimerProps {
  expiresAt: Date
  onExpired?: () => void
}

export function ExpirationTimer({ expiresAt, onExpired }: ExpirationTimerProps) {
  const t = useTranslations("timer")
  const totalMs = 10 * 60 * 1000
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) {
        setRemaining(0)
        onExpired?.()
        return
      }
      setRemaining(ms)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpired])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const progress = Math.max(0, Math.min(1, remaining / totalMs))

  const color =
    progress > 0.4 ? "var(--accent-primary)" :
    progress > 0.15 ? "#FFAA00" :
    "var(--danger)"

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs"
      style={{ borderColor: `${color}44`, color }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 5px ${color}`,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {remaining > 0
        ? `${t("expiresIn")} ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : t("expired")}
    </div>
  )
}
