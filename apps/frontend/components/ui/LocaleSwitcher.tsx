"use client"

import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "next/navigation"

export function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const otherLocale = locale === "es" ? "en" : "es"

  // Replace the locale prefix in the current pathname
  const otherPath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  return (
    <Link
      href={otherPath}
      className="font-mono text-xs px-2 py-1"
      style={{
        border: "1px solid var(--border-mid)",
        color: "var(--text-secondary)",
        transition: "border-color 0.15s, color 0.15s",
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
      aria-label={`Switch to ${otherLocale === "en" ? "English" : "Español"}`}
    >
      {otherLocale.toUpperCase()}
    </Link>
  )
}
