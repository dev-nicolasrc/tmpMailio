"use client"

import { useState, useEffect, useRef } from "react"
import { Copy, Check, RefreshCw, QrCode, Trash2 } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { useMailbox } from "@/hooks/useMailbox"
import { useSocket } from "@/hooks/useSocket"
import { useClipboard } from "@/hooks/useClipboard"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Toast } from "@/components/ui/Toast"
import { QRModal } from "@/components/ui/QRModal"
import { ExpirationTimer } from "@/components/Timer/ExpirationTimer"
import { InboxPanel } from "@/components/Inbox/InboxPanel"
import { DomainDropdown } from "@/components/DomainSelector/DomainDropdown"
import { Footer } from "@/components/Footer/Footer"
import { useMailboxStore } from "@/store/mailboxStore"

const EmailViewer = dynamic(
  () => import("@/components/EmailViewer/EmailViewer").then((m) => ({ default: m.EmailViewer })),
  { ssr: false }
)

const FAQAccordion = dynamic(
  () => import("@/components/FAQ/FAQAccordion").then((m) => ({ default: m.FAQAccordion }))
)

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
  const tAbout = useTranslations("about")
  const tSeo = useTranslations("seoContent")
  const locale = useLocale()
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

  const { toastMessage } = useMailboxStore()
  const { copy, copied } = useClipboard()
  const [showQR, setShowQR] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showDomainPicker, setShowDomainPicker] = useState(false)

  const addrParts = (mailbox?.address ?? "").split("@")
  const addrDomain = addrParts.length > 1 ? addrParts[1] : ""

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
            className="hidden md:block text-xs font-mono px-2 py-0.5"
            style={{ border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
          >
            v2
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <section
          className="w-full flex-shrink-0 grid-bg py-12 px-5 md:px-10"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center">

            {/* Label */}
            <span
              className="font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              // correo temporal · disposable mail
            </span>

            {/* Title */}
            <h1
              className="hero-h1 font-display font-extrabold text-3xl md:text-5xl leading-none tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {t("title")}
            </h1>
            {/* Subtitle — app status visible as subheading, not H1 */}
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {t("subtitle")}
            </p>

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
                      {/* User part from typewriter */}
                      {displayedAddress.includes("@")
                        ? displayedAddress.split("@")[0]
                        : displayedAddress}
                      {/* @ separator */}
                      {displayedAddress.includes("@") && "@"}
                      {/* Clickeable domain */}
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
                      {/* Cursor */}
                      {displayedAddress.length < (mailbox.address?.length ?? 0) ? (
                        <span style={{ animation: "blink-cursor 1s step-end infinite" }}>_</span>
                      ) : (
                        <span className="cursor-blink" />
                      )}
                    </span>

                    {/* Domain dropdown */}
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

                {/* Trust badge */}
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("trustBadge")}
                </p>

              </div>
            ) : (
              /* Skeleton */
              <div
                className="w-full max-w-lg h-16 animate-pulse"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              />
            )}
          </div>
        </section>

        {/* ── Email client ── */}
        <section className="flex-1 flex flex-col px-5 md:px-10 py-6">
          {/* Section label */}
          <div
            className="flex items-center gap-3 mb-3 pb-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              // cliente de correo
            </span>
            {emails.length > 0 && (
              <span
                className="font-mono text-xs"
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

        {/* ── SEO Content ── */}
        <div className="w-full max-w-2xl mx-auto px-5 md:px-10 py-10 flex flex-col gap-10">

          {/* What is TmpMail */}
          <section id="what-is-tmpmail" aria-labelledby="what-is-heading">
            <h2
              id="what-is-heading"
              className="font-display font-bold text-xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {tSeo("whatIs.title")}
            </h2>
            <p
              className="font-mono text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {tSeo("whatIs.body")}
            </p>
          </section>

          {/* How it works */}
          <section id="how-it-works" aria-labelledby="how-heading">
            <h2
              id="how-heading"
              className="font-display font-bold text-xl mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {tSeo("howItWorks.title")}
            </h2>
            <p
              className="font-mono text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {tSeo("howItWorks.intro")}
            </p>
            <ol className="flex flex-col gap-2">
              {(tSeo.raw("howItWorks.steps") as string[]).map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 font-mono text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span
                    className="flex-shrink-0 font-mono text-xs mt-0.5"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          {/* Why use */}
          <section id="why-use-tmpmail" aria-labelledby="why-heading">
            <h2
              id="why-heading"
              className="font-display font-bold text-xl mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {tSeo("whyUse.title")}
            </h2>
            <p
              className="font-mono text-sm mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              {tSeo("whyUse.intro")}
            </p>
            <ul className="flex flex-col gap-2">
              {(tSeo.raw("whyUse.reasons") as string[]).map((reason, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 font-mono text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span style={{ color: "var(--accent-primary)", flexShrink: 0 }}>✓</span>
                  {reason}
                </li>
              ))}
            </ul>
          </section>

        </div>

        <FAQAccordion />

        {/* ── About / Features ── */}
        <section className="max-w-lg mx-auto px-4 py-8 text-center">
          <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
            {tAbout("body")}
          </p>
          <ul className="grid grid-cols-2 gap-2 text-sm text-left">
            {(tAbout.raw("features") as string[]).map((feature, i) => (
              <li key={i} className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--accent-primary)" }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />

      {showQR && mailbox && (
        <QRModal address={mailbox.address} onClose={() => setShowQR(false)} />
      )}

      {toastMessage && <Toast message={toastMessage} />}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "@id": `https://tmpmailio.com/${locale}/#webapp`,
            name: "TmpMail",
            alternateName: "TmpMailio",
            url: `https://tmpmailio.com/${locale}`,
            description: locale === "es"
              ? "Crea un correo desechable gratis en segundos. Sin registro, sin spam, sin datos guardados. Tu email temporal expira en 10 minutos y protege tu privacidad."
              : "Create your free disposable email in seconds. No sign-up, no spam, no data stored. Your temporary address expires in 10 minutes and protects your privacy.",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "All",
            inLanguage: locale,
            isAccessibleForFree: true,
            featureList: locale === "es"
              ? ["Creación instantánea de email temporal", "Sin registro requerido", "Entrega de correo en tiempo real", "Auto-destrucción en 10 minutos", "Sin publicidad", "Genera código QR"]
              : ["Instant temporary email creation", "No registration required", "Real-time email delivery", "Auto-destructs in 10 minutes", "No ads", "Generate QR code"],
            image: "https://tmpmailio.com/og-image.png",
            publisher: {
              "@type": "Organization",
              "@id": "https://tmpmailio.com/#organization",
              name: "TmpMail",
              url: "https://tmpmailio.com",
            },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              availability: "https://schema.org/OnlineOnly",
            },
          }),
        }}
      />
    </div>
  )
}
