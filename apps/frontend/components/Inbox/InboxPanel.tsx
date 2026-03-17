"use client"

import { RefreshCw, Bell, BellOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import type { EmailHeader } from "@tmpmail/shared"

interface InboxPanelProps {
  emails: EmailHeader[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => Promise<void>
  isLoading: boolean
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h`
}

function senderInitial(from: string): string {
  const name = from.split("@")[0]
  return (name.charAt(0) || "?").toUpperCase()
}

function senderName(from: string): string {
  return from.split("@")[0]
}

function senderDomain(from: string): string {
  const parts = from.split("@")
  return parts.length > 1 ? `@${parts[1]}` : ""
}

export function InboxPanel({ emails, selectedId, onSelect, onRefresh, isLoading }: InboxPanelProps) {
  const t = useTranslations("inbox")
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const handleNotifClick = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const handleSelect = (id: string) => {
    setReadIds(prev => new Set(prev).add(id))
    onSelect(id)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-secondary)" }}>

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-mid)" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="font-mono text-[10px] tracking-widest uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("title")}
          </span>
          {emails.length > 0 && (
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 leading-none"
              style={{
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-primary)",
                color: "var(--accent-primary)",
              }}
            >
              {emails.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {typeof window !== "undefined" && "Notification" in window && (
            <button
              onClick={handleNotifClick}
              disabled={notifPermission === "denied"}
              className="btn-flat"
              style={{
                padding: "3px 9px",
                ...(notifPermission === "granted"
                  ? { borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }
                  : {}),
                ...(notifPermission === "denied"
                  ? { opacity: 0.3, cursor: "not-allowed" }
                  : {}),
              }}
              title={t("notifications")}
            >
              {notifPermission === "denied" ? <BellOff size={11} /> : <Bell size={11} />}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-flat"
            style={{ padding: "3px 9px" }}
            title="Actualizar bandeja"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Email list ── */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6 py-10 text-center">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ background: "var(--accent-primary)", opacity: 0.1 }}
              />
              <span
                className="absolute inset-[3px] rounded-full animate-ping"
                style={{ background: "var(--accent-primary)", opacity: 0.08, animationDelay: "0.4s" }}
              />
              <span
                className="w-4 h-4 rounded-full"
                style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-primary)" }}
              />
            </div>
            <div>
              <p
                className="font-mono text-[11px] uppercase tracking-widest mb-1.5"
                style={{ color: "var(--text-primary)" }}
              >
                {t("empty")}
              </p>
              <p className="font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {t("emptyHint")}
              </p>
            </div>
          </div>
        ) : (
          emails.map((email) => {
            const isRead = readIds.has(email.id)
            const isSelected = selectedId === email.id

            return (
              <button
                key={email.id}
                onClick={() => handleSelect(email.id)}
                className="w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors"
                style={{
                  borderBottom: "1px solid var(--border)",
                  borderLeft: isSelected
                    ? "3px solid var(--accent-primary)"
                    : "3px solid transparent",
                  background: isSelected ? "var(--accent-dim)" : "transparent",
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--bg-tertiary)"
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"
                }}
              >
                {/* Avatar */}
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold"
                  style={{
                    background: isSelected ? "var(--accent-dim)" : "var(--bg-tertiary)",
                    border: `1px solid ${isSelected ? "var(--accent-primary)" : "var(--border-mid)"}`,
                    color: isSelected ? "var(--accent-primary)" : "var(--text-secondary)",
                  }}
                >
                  {senderInitial(email.from)}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: sender + time */}
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span
                      className="font-mono text-[12px] truncate"
                      style={{
                        color: isRead ? "var(--text-secondary)" : "var(--text-primary)",
                        fontWeight: isRead ? 400 : 600,
                      }}
                    >
                      {!isRead && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                          style={{ background: "var(--accent-primary)", boxShadow: "0 0 5px var(--accent-primary)" }}
                        />
                      )}
                      {senderName(email.from)}
                      <span
                        className="font-normal"
                        style={{ color: "var(--text-secondary)", opacity: 0.6 }}
                      >
                        {senderDomain(email.from)}
                      </span>
                    </span>
                    <span
                      className="font-mono text-[10px] flex-shrink-0"
                      style={{ color: "var(--text-secondary)", opacity: 0.5 }}
                    >
                      {timeAgo(email.receivedAt)}
                    </span>
                  </div>

                  {/* Row 2: subject */}
                  <p
                    className="font-mono text-[11px] truncate"
                    style={{
                      color: isSelected ? "var(--accent-primary)" : isRead ? "var(--text-secondary)" : "var(--text-primary)",
                      opacity: isRead ? 0.7 : 1,
                    }}
                  >
                    {email.subject || "(Sin asunto)"}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* ── Footer: live indicator ── */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
          style={{ background: "var(--accent-primary)", boxShadow: "0 0 6px var(--accent-primary)" }}
        />
        <span
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("waiting")}
        </span>
      </div>
    </div>
  )
}
