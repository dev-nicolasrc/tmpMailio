"use client"

import { motion } from "framer-motion"
import { useMailbox } from "@/hooks/useMailbox"
import { useSocket } from "@/hooks/useSocket"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { EmailDisplay } from "@/components/Hero/EmailDisplay"
import { CopyButton } from "@/components/Hero/CopyButton"
import { Toolbar } from "@/components/Hero/Toolbar"
import { ExpirationTimer } from "@/components/Timer/ExpirationTimer"
import { InboxPanel } from "@/components/Inbox/InboxPanel"
import { EmailModal } from "@/components/EmailViewer/EmailModal"
import { AdSlot } from "@/components/AdSlot/AdSlot"
import { FAQAccordion } from "@/components/FAQ/FAQAccordion"
import { Footer } from "@/components/Footer/Footer"
import { useTranslations } from "next-intl"

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
  } = useMailbox()

  useSocket()

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
        <span className="font-heading font-bold text-accent-primary text-xl tracking-tight">
          TmpMail
        </span>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-10 gap-10">

        {/* Hero */}
        <motion.section
          className="w-full max-w-2xl flex flex-col items-center gap-6 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-text-primary leading-tight">
            {t("title")}
          </h1>

          {mailbox ? (
            <>
              <EmailDisplay address={mailbox.address} />
              <div className="flex flex-wrap items-center gap-3 justify-center">
                <CopyButton text={mailbox.address} />
                <ExpirationTimer expiresAt={new Date(mailbox.expiresAt)} />
              </div>
              <Toolbar
                address={mailbox.address}
                onNew={() => handleNewMailbox()}
                onDelete={handleDelete}
                onDomainChange={(domain) => handleNewMailbox(domain)}
                isLoading={isLoading}
              />
            </>
          ) : (
            <div className="w-full h-14 rounded-xl bg-bg-secondary border border-[var(--border)] animate-pulse" />
          )}
        </motion.section>

        {/* Ad — below hero (desktop) */}
        <div className="hidden md:flex justify-center w-full">
          <AdSlot size="728x90" />
        </div>
        {/* Ad — below hero (mobile) */}
        <div className="flex md:hidden justify-center w-full">
          <AdSlot size="320x100" />
        </div>

        {/* Inbox + Sidebar */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0">
            <InboxPanel emails={emails} onOpen={selectEmail} />
          </div>
          {/* Sidebar ad (desktop) */}
          <div className="hidden md:block flex-shrink-0">
            <AdSlot size="300x250" />
          </div>
        </div>

        {/* FAQ */}
        <FAQAccordion />
      </main>

      {/* Sticky footer ad (mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 flex justify-center bg-bg-primary border-t border-[var(--border)] py-1 z-30">
        <AdSlot size="320x50" />
      </div>

      <Footer />

      {/* Email viewer modal */}
      {selectedEmail && (
        <EmailModal email={selectedEmail} onClose={clearSelectedEmail} />
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
