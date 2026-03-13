"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
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
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Nav */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Image src="/icono.png" alt="TmpMail" width={48} height={48} className="rounded-xl" />
          <span className="font-heading font-bold text-2xl tracking-tight">
            <span className="text-accent-primary">Tmp</span><span className="text-accent-secondary">Mail</span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <motion.section
          className="w-full flex-shrink-0 bg-gradient-to-b from-accent-primary/[0.04] to-transparent py-10 px-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-5 text-center">
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-text-primary leading-tight">
              {t("title")}
            </h1>

            {mailbox ? (
              <>
                {/* Email display */}
                <div className="border border-accent-primary/40 bg-bg-secondary rounded-xl px-6 py-3 w-full max-w-sm text-center shadow-[0_0_18px_rgba(108,99,255,0.12)]">
                  <span className="font-mono text-lg text-accent-secondary break-all">
                    {mailbox.address}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => copy(mailbox.address)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
                      copied
                        ? "bg-success/20 text-success border border-success/40"
                        : "bg-accent-primary text-white border border-accent-primary btn-glow"
                    }`}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? t("copied") : t("copy")}
                  </button>

                  <button
                    onClick={() => handleNewMailbox()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10 transition-all disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                    {t("newEmail")}
                  </button>

                  <button
                    onClick={() => setShowQR(true)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm border border-accent-secondary/40 text-accent-secondary hover:bg-accent-secondary/10 transition-all btn-glow-cyan"
                  >
                    <QrCode size={15} />
                    {t("generateQR")}
                  </button>

                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm border border-danger/40 text-danger hover:bg-danger/10 transition-all btn-glow-danger"
                  >
                    <Trash2 size={15} />
                    {t("deleteMailbox")}
                  </button>
                </div>

                {/* Timer chip */}
                <ExpirationTimer expiresAt={new Date(mailbox.expiresAt)} />
              </>
            ) : (
              <div className="w-full max-w-sm h-14 rounded-xl bg-bg-secondary border border-[var(--border)] animate-pulse" />
            )}
          </div>
        </motion.section>

        {/* Email client — single column until email is open, then split */}
        <section className="flex-1 flex flex-col px-4 py-4">
          <div className="w-full max-w-5xl mx-auto flex flex-1 min-h-[440px] border border-[var(--border)] rounded-xl overflow-hidden">

            {/* Inbox list: full width when no email open, narrow column when open */}
            {(!isMobile || !selectedEmail) && (
              <div className={`flex flex-col flex-shrink-0 border-r border-[var(--border)] transition-all duration-300
                ${selectedEmail ? "w-[36%] min-w-[220px]" : "w-full border-r-0"}`}
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

            {/* Email viewer: only shown when an email is selected */}
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

      {/* JSON-LD WebApplication schema */}
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
