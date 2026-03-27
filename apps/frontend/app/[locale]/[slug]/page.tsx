import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { MailboxWidget } from "@/components/Mailbox/MailboxWidget"
import { Footer } from "@/components/Footer/Footer"
import { SLUG_PAIRS, getAlternateSlug, getSlugLocale } from "@/lib/use-cases"
import { buildBreadcrumbSchema } from "@/lib/schema/breadcrumb"

type Props = { params: { locale: string; slug: string } }

export const dynamicParams = false

export function generateStaticParams() {
  return SLUG_PAIRS.flatMap((pair) => [
    { locale: "es", slug: pair.es },
    { locale: "en", slug: pair.en },
  ])
}

export async function generateMetadata({ params: { locale, slug } }: Props): Promise<Metadata> {
  setRequestLocale(locale)
  const slugLocale = getSlugLocale(slug)
  if (!slugLocale || slugLocale !== locale) return {}

  const t = await getTranslations({ locale, namespace: "useCases" })
  const altSlug = getAlternateSlug(slug, locale as "es" | "en")!
  const altLocale = locale === "es" ? "en" : "es"
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"

  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.description`),
    alternates: {
      canonical: `${canonical}/${locale}/${slug}`,
      languages: {
        es: `${canonical}/es/${locale === "es" ? slug : altSlug}`,
        en: `${canonical}/en/${locale === "en" ? slug : altSlug}`,
        "x-default": `${canonical}/en/${locale === "en" ? slug : altSlug}`,
      },
    },
    openGraph: {
      title: t(`${slug}.title`),
      description: t(`${slug}.description`),
      url: `${canonical}/${locale}/${slug}`,
      siteName: "TmpMail",
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      alternateLocale: locale === "es" ? "en_US" : "es_ES",
      images: [{ url: `${canonical}/${locale}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t(`${slug}.title`),
      description: t(`${slug}.description`),
      images: [`${canonical}/${locale}/opengraph-image`],
    },
    keywords: locale === "es"
      ? ["correo temporal", "email desechable", "correo desechable", "email temporal gratis", slug.replace(/-/g, " ")]
      : ["temporary email", "disposable email", "temp mail", "throwaway email", slug.replace(/-/g, " ")],
  }
}

export default async function UseCasePage({ params: { locale, slug } }: Props) {
  setRequestLocale(locale)

  const slugLocale = getSlugLocale(slug)
  if (!slugLocale || slugLocale !== locale) notFound()

  const t = await getTranslations({ locale, namespace: "useCases" })
  const altSlug = getAlternateSlug(slug, locale as "es" | "en")!
  const altLocale = locale === "es" ? "en" : "es"
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"

  const steps = t.raw(`${slug}.steps`) as string[]
  const whyItems = t.raw(`${slug}.whyItems`) as string[]
  const whySubsections = t.raw(`${slug}.whySubsections`) as { title: string; body: string }[]
  const scenarios = t.raw(`${slug}.scenarios`) as { title: string; body: string }[]
  const faq = t.raw(`${slug}.faq`) as { q: string; a: string }[]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>

      {/* BreadcrumbList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema(locale, t(`${slug}.title`), slug)) }}
      />

      {/* Header */}
      <header
        className="flex items-center justify-between px-5 md:px-10 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`}>
            <span
              className="font-display font-black text-xl tracking-tighter"
              style={{ letterSpacing: "-0.03em" }}
            >
              <span style={{ color: "var(--accent-primary)" }}>TMP</span>
              <span style={{ color: "var(--text-primary)" }}>MAIL</span>
            </span>
          </Link>
          <span
            className="hidden md:block text-xs font-mono px-2 py-0.5"
            style={{ border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
          >
            v2
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${altLocale}/${altSlug}`}
            className="font-mono text-xs px-3 py-1.5"
            style={{ border: "1px solid var(--border-mid)", color: "var(--text-secondary)" }}
          >
            {altLocale.toUpperCase()}
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* Hero */}
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
              className="font-display font-extrabold text-3xl md:text-5xl leading-none tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {t(`${slug}.title`)}
            </h1>
            <p
              className="text-base leading-relaxed max-w-xl"
              style={{ color: "var(--text-secondary)" }}
            >
              {t(`${slug}.intro`)}
            </p>
          </div>
        </section>

        {/* Widget */}
        <section className="w-full px-5 md:px-10 py-10">
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <MailboxWidget />
          </div>
        </section>

        {/* How-to */}
        <section
          className="w-full max-w-2xl mx-auto px-5 md:px-10 py-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <h2
            className="font-display font-bold text-xl mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {t(`${slug}.howTitle`)}
          </h2>
          <ol className="flex flex-col gap-3">
            {steps.map((step, i) => (
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

        {/* Why */}
        <section
          className="w-full max-w-2xl mx-auto px-5 md:px-10 py-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <h2
            className="font-display font-bold text-xl mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {t(`${slug}.whyTitle`)}
          </h2>
          <ul className="flex flex-col gap-2">
            {whyItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 font-mono text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                <span style={{ color: "var(--accent-primary)", flexShrink: 0 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Why Subsections */}
        {whySubsections && whySubsections.length > 0 && (
          <section
            className="w-full max-w-2xl mx-auto px-5 md:px-10 py-8"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div className="flex flex-col gap-6">
              {whySubsections.map((sub, i) => (
                <div key={i}>
                  <h3
                    className="font-mono text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {sub.title}
                  </h3>
                  <p
                    className="font-mono text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {sub.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Real-world Scenarios */}
        {scenarios && scenarios.length > 0 && (
          <section
            className="w-full max-w-2xl mx-auto px-5 md:px-10 py-8"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <h2
              className="font-display font-bold text-xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {locale === "es" ? "Escenarios reales" : "Real-world scenarios"}
            </h2>
            <div className="flex flex-col gap-6">
              {scenarios.map((scenario, i) => (
                <div key={i}>
                  <h3
                    className="font-mono text-sm font-medium mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {scenario.title}
                  </h3>
                  <p
                    className="font-mono text-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {scenario.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section
          className="w-full max-w-2xl mx-auto px-5 md:px-10 py-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <h2
            className="font-display font-bold text-xl mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            {locale === "es" ? "Preguntas frecuentes" : "Frequently asked questions"}
          </h2>
          <div className="flex flex-col gap-2">
            {faq.map((item, i) => (
              <details
                key={i}
                className="font-mono text-sm"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <summary
                  className="py-3 cursor-pointer font-mono text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.q}
                </summary>
                <p
                  className="pb-3 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

      </main>

      <Footer />

    </div>
  )
}
