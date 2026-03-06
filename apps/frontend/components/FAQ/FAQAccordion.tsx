"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"

interface FAQItem { q: string; a: string }

export function FAQAccordion() {
  const t = useTranslations("faq")
  const items = t.raw("items") as FAQItem[]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section className="w-full max-w-2xl mx-auto py-16 px-4">
      <h2 className="font-heading text-2xl font-bold text-text-primary text-center mb-8">
        {t("title")}
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="card overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left text-text-primary font-semibold hover:text-accent-primary transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span className="text-sm md:text-base">{item.q}</span>
              <ChevronDown
                size={18}
                className={`flex-shrink-0 ml-3 transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* JSON-LD FAQ Schema */}
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
