"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"
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

export function InboxPanel({ emails, selectedId, onSelect, onRefresh, isLoading }: InboxPanelProps) {
  const t = useTranslations("inbox")
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

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
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0 bg-bg-secondary">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-xs text-text-primary uppercase tracking-widest">
            {t("title")}
          </span>
          {emails.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent-primary text-white text-[10px] font-bold leading-none">
              {emails.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-text-secondary hover:text-accent-primary hover:border-accent-primary transition-all disabled:opacity-50"
          title="Actualizar bandeja"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          /* Empty state — full width, centered, llamativo */
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-10 text-center">
            <div className="relative">
              {/* Outer ring */}
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: "var(--accent-primary)" }}
              />
              {/* Spinner */}
              <span
                className="relative flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: "rgba(108,99,255,0.12)", border: "2px solid rgba(108,99,255,0.3)" }}
              >
                <span
                  className="w-8 h-8 rounded-full border-[3px] border-bg-tertiary animate-spin"
                  style={{ borderTopColor: "var(--accent-primary)" }}
                />
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">{t("empty")}</p>
              <p className="text-xs text-text-secondary/60 max-w-[180px]">{t("emptyHint")}</p>
            </div>
          </div>
        ) : (
          emails.map((email) => {
            const isRead = readIds.has(email.id)
            const isSelected = selectedId === email.id
            return (
              <div
                key={email.id}
                onClick={() => handleSelect(email.id)}
                className={`flex items-start gap-2.5 px-4 py-3 cursor-pointer border-b border-[var(--border)]/40 transition-all
                  ${isSelected
                    ? "bg-accent-primary/10 border-l-2 border-l-accent-primary"
                    : "hover:bg-bg-primary border-l-2 border-l-transparent"
                  }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0 w-2 h-2">
                  {!isRead && (
                    <span
                      className="block w-2 h-2 rounded-full"
                      style={{ background: "var(--accent-primary)", boxShadow: "0 0 6px var(--accent-primary)" }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-sm truncate ${isRead ? "text-text-secondary" : "font-semibold text-text-primary"}`}>
                      {email.from}
                    </span>
                    <span className="font-mono text-[10px] text-text-secondary/50 flex-shrink-0">
                      {timeAgo(email.receivedAt)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isSelected ? "text-accent-primary/80" : "text-text-secondary"}`}>
                    {email.subject}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer: live indicator */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 border-t border-[var(--border)] bg-bg-secondary">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
          style={{ background: "var(--success)", boxShadow: "0 0 6px var(--success)" }}
        />
        <span className="text-xs text-text-secondary/60">{t("waiting")}</span>
      </div>
    </div>
  )
}
