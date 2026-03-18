"use client"

import { useTranslations } from "next-intl"

interface FAQItem { q: string; a: string }

export function FAQAccordion() {
  const t = useTranslations("faq")
  const items = t.raw("items") as FAQItem[]

  return (
    <section className="w-full max-w-2xl mx-auto py-14 px-5 md:px-10">
      {/* Section header */}
      <div
        className="flex items-center gap-4 mb-8 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="font-mono text-xs tracking-widest uppercase"
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

          return (
            <details
              key={i}
              className="group"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <summary
                className="w-full flex items-start gap-4 px-0 py-4 text-left cursor-pointer list-none"
                style={{ WebkitAppearance: "none" }}
              >
                <span
                  className="font-mono text-xs flex-shrink-0 mt-0.5"
                  style={{ color: "var(--text-secondary)", opacity: 0.5 }}
                >
                  {num}
                </span>
                <span
                  className="flex-1 font-mono text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.q}
                </span>
                <span
                  className="font-mono text-base flex-shrink-0 ml-3 transition-transform group-open:rotate-45"
                  style={{ color: "var(--accent-primary)" }}
                >
                  +
                </span>
              </summary>

              <p
                className="pl-9 pr-4 pb-4 font-mono text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.a}
              </p>
            </details>
          )
        })}
      </div>
    </section>
  )
}
