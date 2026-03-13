"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Copy, Check, RefreshCw, QrCode, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useMailbox } from "@/hooks/useMailbox"
import { useSocket } from "@/hooks/useSocket"
import { useClipboard } from "@/hooks/useClipboard"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { QRModal } from "@/components/ui/QRModal"
import { ExpirationTimer } from "@/components/Timer/ExpirationTimer"
import { InboxPanel } from "@/components/Inbox/InboxPanel"
import { EmailViewer } from "@/components/EmailViewer/EmailViewer"
import { FAQAccordion } from "@/components/FAQ/FAQAccordion"
import { Footer } from "@/components/Footer/Footer"

/* Typewriter effect for the email address */
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

export default function HomePage() {
  const t = useTranslations("hero")
  const {
    mailbox,
    emails,
    selectedEmail,
    isLoading,
    createMailbox,
    deleteMailbox,
    selectEmail,
    clearSelectedEmail,
    loadEmails,
  } = useMailbox()

  useSocket()

  const { copy, copied } = useClipboard()
  const [showQR, setShowQR] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const displayedAddress = useTypewriter(mailbox?.address ?? "")

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const handleNewMailbox = async (domain?: string) => {
    await createMailbox(domain)
  }

  const handleDelete = async () => {
    await deleteMailbox()
    await createMailbox()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>

      {/* ── Nav ── */}
      <header
        className="flex items-center justify-between px-5 md:px-10 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-display font-black text-xl tracking-tighter"
            style={{ letterSpacing: "-0.03em" }}
          >
            <span style={{ color: "var(--accent-primary)" }}>TMP</span>
            <span style={{ color: "var(--text-primary)" }}>MAIL</span>
          </span>
          <span
            className="hidden md:block text-[10px] font-mono px-2 py-0.5"
            style={{ border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
          >
            v2
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <motion.section
          className="w-full flex-shrink-0 grid-bg py-12 px-5 md:px-10"
          style={{ borderBottom: "1px solid var(--border)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center">

            {/* Label */}
            <span
              className="font-mono text-[10px] tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              // correo temporal · disposable mail
            </span>

            {/* Title */}
            <motion.h1
              className="font-display font-extrabold text-3xl md:text-5xl leading-none tracking-tight"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              style={{ color: "var(--text-primary)" }}
            >
              {t("title")}
            </motion.h1>

            {mailbox ? (
              <motion.div
                className="w-full flex flex-col items-center gap-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {/* Email address box */}
                <div className="address-box w-full max-w-lg px-5 py-4">
                  <div className="scanline" />
                  <div className="flex items-center justify-between gap-3 min-h-[28px]">
                    <span
                      className="font-mono text-base md:text-lg break-all text-left"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {displayedAddress}
                      {displayedAddress.length < (mailbox.address?.length ?? 0) ? (
                        <span style={{ color: "var(--accent-primary)", animation: "blink-cursor 1s step-end infinite" }}>_</span>
                      ) : (
                        <span className="cursor-blink" />
                      )}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => copy(mailbox.address)}
                        title="Copiar correo"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "2px",
                          color: copied ? "var(--accent-primary)" : "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
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
                  >
                    <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
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

                {/* Timer */}
                <ExpirationTimer expiresAt={new Date(mailbox.expiresAt)} />

              </motion.div>
            ) : (
              /* Skeleton */
              <div
                className="w-full max-w-lg h-16 animate-pulse"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              />
            )}
          </div>
        </motion.section>

        {/* ── Email client ── */}
        <section className="flex-1 flex flex-col px-5 md:px-10 py-6">
          {/* Section label */}
          <div
            className="flex items-center gap-3 mb-3 pb-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="font-mono text-[10px] tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              // cliente de correo
            </span>
            {emails.length > 0 && (
              <span
                className="font-mono text-[10px]"
                style={{ color: "var(--accent-primary)" }}
              >
                [{emails.length}]
              </span>
            )}
          </div>

          <div
            className="w-full max-w-5xl mx-auto flex flex-1 min-h-[440px] overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* Inbox list */}
            {(!isMobile || !selectedEmail) && (
              <div
                className={`flex flex-col flex-shrink-0 transition-all duration-300
                  ${selectedEmail ? "w-[36%] min-w-[220px]" : "w-full"}`}
                style={selectedEmail ? { borderRight: "1px solid var(--border)" } : {}}
              >
                <InboxPanel
                  emails={emails}
                  selectedId={selectedEmail?.id ?? null}
                  onSelect={selectEmail}
                  onRefresh={loadEmails}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Email viewer */}
            {selectedEmail && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <EmailViewer
                  email={selectedEmail}
                  isMobile={isMobile}
                  onBack={clearSelectedEmail}
                />
              </div>
            )}
          </div>
        </section>

        <FAQAccordion />
      </main>

      <Footer />

      {showQR && mailbox && (
        <QRModal address={mailbox.address} onClose={() => setShowQR(false)} />
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "TmpMail",
            applicationCategory: "UtilitiesApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description: "Free temporary disposable email service",
          }),
        }}
      />
    </div>
  )
}
