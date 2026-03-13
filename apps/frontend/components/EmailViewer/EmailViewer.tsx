"use client"

import { useEffect, useRef, useState } from "react"
import { Download, AlignLeft, Code2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Email } from "@tmpmail/shared"

interface EmailViewerProps {
  email: Email | null
  isMobile: boolean
  onBack: () => void
}

export function EmailViewer({ email, isMobile, onBack }: EmailViewerProps) {
  const t = useTranslations("viewer")
  const tInbox = useTranslations("inbox")
  const [viewMode, setViewMode] = useState<"html" | "text">("html")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Inject sanitized HTML into sandboxed iframe with dark theme
  useEffect(() => {
    if (viewMode !== "html" || !email?.html || !iframeRef.current) return
    const iframe = iframeRef.current
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; font-size: 14px; color: #F0F0FF; background: #12121A; padding: 16px; line-height: 1.6; }
            img { max-width: 100%; }
            a { color: #00D4FF; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"><\/script>
        </head>
        <body id="content"></body>
        <script>
          document.getElementById('content').innerHTML =
            DOMPurify.sanitize(${JSON.stringify(email.html)}, { FORBID_TAGS: ['script','iframe'] });
        <\/script>
      </html>
    `)
    doc.close()
  }, [email?.html, viewMode])

  // Escape key closes viewer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onBack() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onBack])

  // Reset to HTML view when email changes
  useEffect(() => { setViewMode("html") }, [email?.id])

  if (!email) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 bg-bg-primary">
        <span className="text-4xl opacity-20">✉</span>
        <p className="text-sm text-text-secondary/40">{t("empty")}</p>
      </div>
    )
  }

  const formattedDate = new Date(email.receivedAt).toLocaleString()

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)]">
        {isMobile && (
          <button
            onClick={onBack}
            aria-label={tInbox("back")}
            className="text-xs text-text-secondary hover:text-text-primary transition-colors mb-2 flex items-center gap-1"
          >
            {tInbox("back")}
          </button>
        )}
        <p className="font-heading font-bold text-text-primary text-base leading-snug">
          {email.subject}
        </p>
        <p className="font-mono text-xs text-text-secondary mt-1">
          {t("from")}: {email.from} · {formattedDate}
        </p>
      </div>

      {/* View mode tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b border-[var(--border)]">
        <button
          onClick={() => setViewMode("html")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
            viewMode === "html"
              ? "bg-accent-primary text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Code2 size={12} /> {t("viewHTML")}
        </button>
        <button
          onClick={() => setViewMode("text")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
            viewMode === "text"
              ? "bg-accent-primary text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <AlignLeft size={12} /> {t("viewText")}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "html" && email.html ? (
          <iframe
            ref={iframeRef}
            sandbox="allow-same-origin"
            className="w-full h-full min-h-[300px] border-0"
            title="Email content"
          />
        ) : (
          <pre className="p-4 text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
            {email.text ?? "(Sin contenido de texto)"}
          </pre>
        )}
      </div>

      {/* Attachments */}
      {email.attachments?.length > 0 && (
        <div className="flex-shrink-0 border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-text-secondary mb-2">{t("attachments")}</p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                download={att.filename}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-bg-secondary text-text-secondary hover:text-accent-primary transition-colors border border-[var(--border)]"
              >
                <Download size={12} />
                {att.filename}
                <span className="text-text-secondary/60">
                  ({(att.size / 1024).toFixed(1)}KB)
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
