"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

interface ExpirationTimerProps {
  expiresAt: Date
  onExpired?: () => void
}

const RADIUS = 36
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ExpirationTimer({ expiresAt, onExpired }: ExpirationTimerProps) {
  const t = useTranslations("timer")
  const totalMs = 10 * 60 * 1000 // 10 min baseline for progress calculation
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
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const color =
    progress > 0.4 ? "var(--accent-primary)" :
    progress > 0.15 ? "#FFAA00" :
    "var(--danger)"

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={RADIUS} fill="none" stroke="var(--bg-tertiary)" strokeWidth="6" />
          <circle
            cx="44" cy="44" r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-sm font-bold" style={{ color }}>
            {remaining > 0
              ? `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
              : "00:00"}
          </span>
        </div>
      </div>
      <span className="text-xs text-text-secondary">{t("expiresIn")}</span>
    </div>
  )
}
