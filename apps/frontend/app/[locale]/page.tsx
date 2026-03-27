"use client"

import { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { buildFaqSchema } from "@/lib/schema/faq"
import { buildWebAppSchema } from "@/lib/schema/webapp"
import { useMailboxStore } from "@/store/mailboxStore"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher"
import { MailboxWidget } from "@/components/Mailbox/MailboxWidget"
import { InboxPanel } from "@/components/Inbox/InboxPanel"
import { Footer } from "@/components/Footer/Footer"

const EmailViewer = dynamic(
  () => import("@/components/EmailViewer/EmailViewer").then((m) => ({ default: m.EmailViewer })),
  { ssr: false }
)

const FAQAccordion = dynamic(
  () => import("@/components/FAQ/FAQAccordion").then((m) => ({ default: m.FAQAccordion }))
)

export default function HomePage() {
  const t = useTranslations("hero")
  const tAbout = useTranslations("about")
  const tSeo = useTranslations("seoContent")
  const locale = useLocale()

  const {
    emails,
    selectedEmail,
    isLoading,
    selectEmail,
    clearSelectedEmail,
    loadEmails,
  } = useMailboxStore()

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

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
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main id="main-content" className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <section
          className="w-full flex-shrink-0 grid-bg py-12 px-5 md:px-10"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 text-center">
            <span
              className="font-mono text-xs tracking-widest uppercase"
              style={{ color: "var(--text-secondary)" }}
            >
              // correo temporal · disposable mail
            </span>
            <h1
              className="hero-h1 font-display font-extrabold text-3xl md:text-5xl leading-tight tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {t("title")}
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {t("subtitle")}
            </p>

            <MailboxWidget />
          </div>
        </section>

        {/* ── Email client ── */}
        <section className="flex-1 flex flex-col px-5 md:px-10 py-6">
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

          {/* ── Who Uses TmpMail ── */}
          <section id="who-uses-tmpmail" aria-labelledby="who-uses-heading">
            <h2
              id="who-uses-heading"
              className="font-display font-bold text-xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {tSeo("whoUses.title")}
            </h2>
            <div className="flex flex-col gap-4">
              {(tSeo.raw("whoUses.items") as { title: string; body: string }[]).map((item, i) => (
                <div key={i}>
                  <h3
                    className="font-mono text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="font-mono text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Comparison ── */}
          <section id="comparison" aria-labelledby="comparison-heading">
            <h2
              id="comparison-heading"
              className="font-display font-bold text-xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {tSeo("comparison.title")}
            </h2>
            <p
              className="font-mono text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {tSeo("comparison.body")}
            </p>
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebAppSchema(locale as "es" | "en")) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema(locale as "es" | "en")) }}
      />
    </div>
  )
}
