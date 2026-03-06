"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Download, AlignLeft, Code2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Email } from "@tmpmail/shared"

interface EmailModalProps {
  email: Email
  onClose: () => void
}

export function EmailModal({ email, onClose }: EmailModalProps) {
  const t = useTranslations("viewer")
  const [viewMode, setViewMode] = useState<"html" | "text">("html")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Sanitize and inject HTML into sandboxed iframe
  useEffect(() => {
    if (viewMode !== "html" || !email.html || !iframeRef.current) return
    const iframe = iframeRef.current
    const doc = iframe.contentDocument
    if (!doc) return

    // DOMPurify runs inside the iframe context for extra isolation
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; font-size: 14px; color: #111; background: #fff; padding: 16px; }
            img { max-width: 100%; }
            a { color: #6C63FF; }
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
  }, [email.html, viewMode])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const formattedDate = new Date(email.receivedAt).toLocaleString()

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="card w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs text-text-secondary">
                {t("from")}: <span className="text-accent-secondary">{email.from}</span>
              </p>
              <p className="font-heading font-bold text-text-primary text-lg mt-1 truncate">
                {email.subject}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">{formattedDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-danger transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)]">
            <button
              onClick={() => setViewMode("html")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "html"
                  ? "bg-accent-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <Code2 size={13} /> {t("viewHTML")}
            </button>
            <button
              onClick={() => setViewMode("text")}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "text"
                  ? "bg-accent-primary text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <AlignLeft size={13} /> {t("viewText")}
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto">
            {viewMode === "html" && email.html ? (
              <iframe
                ref={iframeRef}
                sandbox="allow-same-origin"
                className="w-full h-full min-h-[300px] border-0 bg-white"
                title="Email content"
              />
            ) : (
              <pre className="p-5 text-sm text-text-secondary whitespace-pre-wrap font-mono leading-relaxed">
                {email.text ?? "(Sin contenido de texto)"}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {email.attachments?.length > 0 && (
            <div className="border-t border-[var(--border)] px-5 py-3">
              <p className="text-xs text-text-secondary mb-2">{t("attachments")}</p>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    download={att.filename}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors border border-[var(--border)]"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
