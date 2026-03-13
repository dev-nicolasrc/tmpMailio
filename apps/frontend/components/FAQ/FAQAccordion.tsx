"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"

interface FAQItem { q: string; a: string }

export function FAQAccordion() {
  const t = useTranslations("faq")
  const items = t.raw("items") as FAQItem[]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section
      className="w-full max-w-2xl mx-auto py-14 px-5 md:px-10"
    >
      {/* Section header */}
      <div
        className="flex items-center gap-4 mb-8 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="font-mono text-[10px] tracking-widest uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          // preguntas frecuentes
        </span>
        <h2
          className="font-display font-bold text-xl"
          style={{ color: "var(--text-primary)" }}
        >
          {t("title")}
        </h2>
      </div>

      <div className="flex flex-col">
        {items.map((item, i) => {
          const num = String(i + 1).padStart(2, "0")
          const isOpen = open === i

          return (
            <div
              key={i}
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <button
                className="w-full flex items-start gap-4 px-0 py-4 text-left transition-colors group"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
              >
                <span
                  className="font-mono text-[10px] flex-shrink-0 mt-0.5"
                  style={{ color: isOpen ? "var(--accent-primary)" : "var(--text-secondary)", opacity: 0.5 }}
                >
                  {num}
                </span>
                <span
                  className="flex-1 font-mono text-[13px] leading-relaxed"
                  style={{ color: isOpen ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {item.q}
                </span>
                <span
                  className="font-mono text-base flex-shrink-0 ml-3 transition-transform"
                  style={{ color: "var(--accent-primary)", transform: isOpen ? "rotate(45deg)" : "none" }}
                >
                  +
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <p
                      className="pl-9 pr-4 pb-4 font-mono text-[12px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />
    </section>
  )
}
