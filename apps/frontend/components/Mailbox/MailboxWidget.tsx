"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Copy, Check, RefreshCw, QrCode, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMailbox } from "@/hooks/useMailbox"
import { useSocket } from "@/hooks/useSocket"
import { useClipboard } from "@/hooks/useClipboard"
import { Toast } from "@/components/ui/Toast"
import { QRModal } from "@/components/ui/QRModal"
import { ExpirationTimer } from "@/components/Timer/ExpirationTimer"
import { DomainDropdown } from "@/components/DomainSelector/DomainDropdown"
import { useMailboxStore } from "@/store/mailboxStore"

function useTypewriter(text: string, speed = 28) {
  const [displayed, setDisplayed] = useState("")
  const prevText = useRef("")

  useEffect(() => {
    if (!text) { setDisplayed(""); return }
    if (text === prevText.current) return
    prevText.current = text
    setDisplayed("")
    let i = 0
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return displayed
}

export function MailboxWidget() {
  const t = useTranslations("hero")
  const tToast = useTranslations("toast")
  const { mailbox, isLoading, createMailbox, deleteMailbox, showToast } = useMailbox()
  useSocket()

  const { toastMessage } = useMailboxStore()
  const { copy, copied } = useClipboard()
  const [showQR, setShowQR] = useState(false)
  const [showDomainPicker, setShowDomainPicker] = useState(false)

  const addrParts = (mailbox?.address ?? "").split("@")
  const addrDomain = addrParts.length > 1 ? addrParts[1] : ""
  const displayedAddress = useTypewriter(mailbox?.address ?? "")

  const handleNewMailbox = async (domain?: string) => {
    try {
      await createMailbox(domain)
    } catch {
      showToast(tToast("mailboxRenewFailed") ?? "Could not create mailbox. Try again.")
    }
  }

  const handleExpired = useCallback(async () => {
    const MAX_RETRIES = 3
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await createMailbox()
        showToast(tToast("mailboxRenewed"))
        return
      } catch {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
        }
      }
    }
    showToast(tToast("mailboxRenewFailed") ?? "Could not renew mailbox. Please try manually.")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createMailbox, showToast])

  const handleDelete = async () => {
    try {
      await deleteMailbox()
      await createMailbox()
    } catch {
      showToast(tToast("mailboxRenewFailed") ?? "Could not create mailbox. Try again.")
    }
  }

  return (
    <>
      {mailbox ? (
        <div className="w-full flex flex-col items-center gap-4 animate-mailbox-in">

          {/* Email address box */}
          <div className="address-box w-full max-w-lg px-5 py-4" style={{ position: "relative" }}>
            <div className="scanline" />
            <div className="flex items-center justify-between gap-3 min-h-[28px]">
              <span
                className="font-mono text-base md:text-lg text-left"
                style={{ color: "var(--accent-primary)" }}
              >
                {displayedAddress.includes("@")
                  ? displayedAddress.split("@")[0]
                  : displayedAddress}
                {displayedAddress.includes("@") && "@"}
                {displayedAddress.includes("@") && (
                  <span
                    onClick={() => setShowDomainPicker(v => !v)}
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid rgba(184,255,53,0.4)",
                      paddingBottom: "1px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    {addrDomain}
                    <span style={{ fontSize: "9px", opacity: 0.6 }}>▼</span>
                  </span>
                )}
                {displayedAddress.length < (mailbox.address?.length ?? 0) ? (
                  <span style={{ animation: "blink-cursor 1s step-end infinite" }}>_</span>
                ) : (
                  <span className="cursor-blink" />
                )}
              </span>

              {showDomainPicker && (
                <DomainDropdown
                  onSelect={(domain) => {
                    handleNewMailbox(domain)
                    setShowDomainPicker(false)
                  }}
                  onClose={() => setShowDomainPicker(false)}
                />
              )}

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => copy(mailbox.address)}
                  title="Copiar correo"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    minHeight: "48px",
                    minWidth: "48px",
                    color: copied ? "var(--accent-primary)" : "var(--text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.15s ease",
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <span
                  className="font-mono text-[9px] uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ACTIVO
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 justify-center stagger">
            <button
              onClick={() => copy(mailbox.address)}
              className={`btn-flat ${copied ? "" : "btn-accent"}`}
              style={copied ? { borderColor: "var(--success)", color: "var(--success)" } : {}}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? t("copied") : t("copy")}
            </button>

            <button
              onClick={() => handleNewMailbox()}
              disabled={isLoading}
              className="btn-flat btn-secondary"
              aria-label={t("newEmail")}
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
              {t("newEmail")}
            </button>

            <button
              onClick={() => setShowQR(true)}
              className="btn-flat btn-secondary"
            >
              <QrCode size={12} />
              {t("generateQR")}
            </button>

            <button
              onClick={handleDelete}
              className="btn-flat btn-danger"
            >
              <Trash2 size={12} />
              {t("deleteMailbox")}
            </button>
          </div>

          {/* Timer — use ISO string to avoid new Date object on every render */}
          <ExpirationTimer
            expiresAt={mailbox.expiresAt}
            onExpired={handleExpired}
          />

        </div>
      ) : (
        /* Skeleton — h-[60px] matches address-box rendered height for CLS */
        <div
          className="w-full max-w-lg h-[60px] animate-pulse"
          style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        />
      )}

      {/* Trust badge — outside conditional so it renders in SSR HTML */}
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {t("trustBadge")}
      </p>

      {showQR && mailbox && (
        <QRModal address={mailbox.address} onClose={() => setShowQR(false)} />
      )}

      {toastMessage && <Toast message={toastMessage} />}
    </>
  )
}
