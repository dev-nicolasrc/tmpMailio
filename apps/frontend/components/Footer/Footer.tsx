"use client"

import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

export function Footer() {
  const t = useTranslations("footer")
  const locale = useLocale()
  const otherLocale = locale === "es" ? "en" : "es"

  return (
    <footer
      className="mt-auto"
      style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      <div className="max-w-5xl mx-auto px-5 md:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="font-display font-black text-sm tracking-tighter"
            style={{ color: "var(--accent-primary)", letterSpacing: "-0.03em" }}
          >
            TMPMAIL
          </span>
          <span
            className="font-mono text-[10px] hidden md:block"
            style={{ color: "var(--text-secondary)" }}
          >
            — {t("tagline")}
          </span>
        </div>

        <nav className="flex items-center gap-1 flex-wrap justify-center">
          {[
            { href: "/privacy", label: t("privacy") },
            { href: "/terms", label: t("terms") },
            { href: "/contact", label: t("contact") },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] px-3 py-1.5 transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--text-secondary)")}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href={`/${otherLocale}`}
            className="font-mono text-[11px] px-3 py-1.5 transition-all"
            style={{
              border: "1px solid var(--border-mid)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = "var(--accent-primary)"
              el.style.color = "var(--accent-primary)"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = "var(--border-mid)"
              el.style.color = "var(--text-secondary)"
            }}
          >
            {otherLocale === "en" ? "EN" : "ES"}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
