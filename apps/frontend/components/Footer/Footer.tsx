"use client"

import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

export function Footer() {
  const t = useTranslations("footer")
  const tMeta = useTranslations("meta")
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
            className="font-mono text-xs hidden md:block"
            style={{ color: "var(--text-secondary)" }}
          >
            — {t("tagline")}
          </span>
          <span className="font-mono text-xs hidden md:block" style={{ color: "var(--text-secondary)" }}>
            © {new Date().getFullYear()} TmpMailio
          </span>
        </div>

        <nav className="flex items-center gap-1 flex-wrap justify-center">
          {[
            { href: `/${locale}/privacy`, label: t("privacy") },
            { href: `/${locale}/terms`, label: t("terms") },
            { href: `/${locale}/contact`, label: t("contact") },
            { href: `/${locale}/about`, label: t("about") },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="font-mono text-sm px-3 py-1.5 transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = "var(--text-primary)")}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = "var(--text-secondary)")}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href={`/${otherLocale}`}
            className="font-mono text-sm px-3 py-1.5 transition-all"
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
      <p className="text-center font-mono text-xs py-2" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
        {tMeta("lastUpdated")}
      </p>
    </footer>
  )
}
