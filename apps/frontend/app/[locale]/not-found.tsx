import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"

export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: "notFound" })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-5"
      style={{ background: "var(--bg-primary)" }}
    >
      <span
        className="font-mono text-xs tracking-widest uppercase"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("label")}
      </span>

      <h1
        className="font-display font-black glitch"
        style={{
          fontSize: "clamp(96px, 20vw, 160px)",
          lineHeight: 1,
          color: "var(--accent-primary)",
          letterSpacing: "-6px",
        }}
      >
        404
      </h1>

      <p
        className="font-mono text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("message")}
      </p>

      <Link
        href={`/${locale}`}
        className="btn-flat btn-accent font-mono text-xs"
        style={{ marginTop: "8px" }}
      >
        {t("back")}
      </Link>
    </div>
  )
}
