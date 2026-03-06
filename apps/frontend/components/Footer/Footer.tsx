"use client"

import { useTranslations, useLocale } from "next-intl"
import Link from "next/link"

export function Footer() {
  const t = useTranslations("footer")
  const locale = useLocale()
  const otherLocale = locale === "es" ? "en" : "es"

  return (
    <footer className="border-t border-[var(--border)] bg-bg-secondary mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-accent-primary text-lg">TmpMail</span>
          <span className="text-text-secondary text-sm hidden md:block">—</span>
          <span className="text-text-secondary text-sm hidden md:block">{t("tagline")}</span>
        </div>

        <nav className="flex items-center gap-4 text-sm text-text-secondary">
          <Link href="/privacy" className="hover:text-accent-primary transition-colors">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="hover:text-accent-primary transition-colors">
            {t("terms")}
          </Link>
          <Link href="/contact" className="hover:text-accent-primary transition-colors">
            {t("contact")}
          </Link>
          <Link
            href={`/${otherLocale}`}
            className="px-3 py-1 rounded-lg border border-[var(--border)] hover:border-accent-primary hover:text-accent-primary transition-all text-xs"
          >
            {otherLocale === "en" ? "English" : "Español"}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
