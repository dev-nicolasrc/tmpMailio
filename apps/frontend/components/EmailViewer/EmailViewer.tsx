"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Download, ArrowLeft, Calendar, User } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Email } from "@tmpmail/shared"

interface EmailViewerProps {
  email: Email | null
  isMobile: boolean
  onBack: () => void
}

/* ── Estilos del iframe — renderizado fiel a un cliente de correo ── */
const IFRAME_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html { height: auto; }
  body {
    margin: 0;
    padding: 24px 28px 32px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.75;
    color: #1a1a1a;
    background: #ffffff;
    word-break: break-word;
    overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3, h4, h5, h6 {
    line-height: 1.3;
    margin: 1em 0 0.4em;
    color: #111111;
    font-weight: 700;
  }
  h1 { font-size: 22px; }
  h2 { font-size: 18px; }
  h3 { font-size: 16px; }
  h4, h5, h6 { font-size: 14px; }
  p { margin: 0 0 0.85em; }
  p:last-child { margin-bottom: 0; }
  a {
    color: #2563eb;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  a:hover { color: #1d4ed8; }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 8px 0;
  }
  blockquote {
    margin: 12px 0;
    padding: 10px 16px;
    border-left: 3px solid #cbd5e1;
    color: #64748b;
    background: #f8fafc;
    font-style: italic;
  }
  blockquote blockquote {
    margin-top: 8px;
    border-left-color: #e2e8f0;
  }
  pre {
    font-family: "Courier New", Courier, monospace;
    font-size: 12.5px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 12px 16px;
    overflow-x: auto;
    white-space: pre-wrap;
    margin: 8px 0;
    line-height: 1.55;
    color: #334155;
  }
  code {
    font-family: "Courier New", Courier, monospace;
    font-size: 12.5px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 1px 5px;
    color: #c7254e;
  }
  pre code { background: none; border: none; padding: 0; color: inherit; }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 20px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 13px;
  }
  td, th {
    padding: 8px 12px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    text-align: left;
  }
  th {
    background: #f8fafc;
    font-weight: 600;
    color: #374151;
  }
  tr:nth-child(even) td { background: #fafafa; }
  ul, ol {
    padding-left: 22px;
    margin: 0 0 0.85em;
  }
  li { margin-bottom: 3px; }
  li:last-child { margin-bottom: 0; }
  strong, b { color: #111; }
  small, .small { font-size: 12px; color: #6b7280; }
  .gmail_quote, .gmail_attr { color: #888; font-size: 13px; }
  [style*="color: rgb(136"] { color: #6b7280 !important; }
`

export function EmailViewer({ email, isMobile, onBack }: EmailViewerProps) {
  const t = useTranslations("viewer")
  const tInbox = useTranslations("inbox")
  const [srcdoc, setSrcdoc] = useState("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  /* Auto-resize iframe to full content height */
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.documentElement) return
    const h = iframe.contentDocument.documentElement.scrollHeight
    if (h > 0) iframe.style.height = `${h + 8}px`
  }, [])

  /* Build sanitized srcdoc */
  useEffect(() => {
    if (!email) { setSrcdoc(""); return }

    async function build() {
      const { default: DOMPurify } = await import("dompurify")

      let body: string
      if (email!.html) {
        body = DOMPurify.sanitize(email!.html, {
          FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
          ADD_ATTR: ["target", "style"],
          ALLOW_DATA_ATTR: false,
        })
      } else if (email!.text) {
        const escaped = email!.text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>")
        body = `<div style="color:#374151;font-family:inherit">${escaped}</div>`
      } else {
        body = `<p style="color:#9ca3af;font-style:italic;text-align:center;padding:24px 0">Sin contenido</p>`
      }

      setSrcdoc(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${IFRAME_STYLES}</style></head><body>${body}</body></html>`)
    }

    build()
  }, [email?.id, email?.html, email?.text])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onBack() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onBack])

  if (!email) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center gap-3"
        style={{ background: "var(--bg-primary)" }}
      >
        <span style={{ fontSize: 40, opacity: 0.1 }}>✉</span>
        <p
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color: "var(--text-secondary)", opacity: 0.4 }}
        >
          {t("empty")}
        </p>
      </div>
    )
  }

  const date = new Date(email.receivedAt)
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  })

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{ borderBottom: "1px solid var(--border-mid)", background: "var(--bg-secondary)" }}
      >
        {isMobile && (
          <button
            onClick={onBack}
            aria-label={tInbox("back")}
            className="btn-flat mb-3"
            style={{ padding: "3px 8px", fontSize: "10px" }}
          >
            <ArrowLeft size={10} />
            {tInbox("back")}
          </button>
        )}

        {/* Subject */}
        <h2
          className="font-display font-bold leading-snug mb-3"
          style={{ color: "var(--text-primary)", fontSize: "15px" }}
        >
          {email.subject || "(Sin asunto)"}
        </h2>

        {/* Meta grid */}
        <div className="flex flex-col gap-1.5">
          {/* From */}
          <div className="flex items-center gap-2.5">
            <span
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold"
              style={{
                background: "var(--accent-dim)",
                border: "1px solid var(--accent-primary)",
                color: "var(--accent-primary)",
              }}
            >
              {email.from.charAt(0).toUpperCase()}
            </span>
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                className="font-mono text-xs uppercase tracking-wider flex-shrink-0"
                style={{ color: "var(--text-secondary)", opacity: 0.6 }}
              >
                <User size={9} className="inline mr-1" />De
              </span>
              <span
                className="font-mono text-xs truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {email.from}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2.5 pl-8">
            <span
              className="font-mono text-xs uppercase tracking-wider flex-shrink-0"
              style={{ color: "var(--text-secondary)", opacity: 0.6 }}
            >
              <Calendar size={9} className="inline mr-1" />Fecha
            </span>
            <span
              className="font-mono text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {formattedDate}
              <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
              {formattedTime}
            </span>
          </div>
        </div>
      </div>

      {/* ── Email body ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--bg-primary)", padding: "16px" }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderTop: "3px solid var(--accent-primary)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-same-origin"
            onLoad={handleIframeLoad}
            className="w-full border-0"
            style={{ display: "block", minHeight: "200px", height: "200px" }}
            title="Email content"
          />
        </div>
      </div>

      {/* ── Attachments ── */}
      {email.attachments?.length > 0 && (
        <div
          className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          <p
            className="font-mono text-xs uppercase tracking-widest mb-2.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("attachments")} · {email.attachments.length}
          </p>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                download={att.filename}
                className="btn-flat"
                style={{ fontSize: "11px" }}
              >
                <Download size={11} />
                {att.filename}
                <span style={{ opacity: 0.45 }}>
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
