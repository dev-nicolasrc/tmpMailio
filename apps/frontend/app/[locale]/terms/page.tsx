import { getTranslations } from "next-intl/server"
import { buildBreadcrumbSchema } from "@/lib/schema/breadcrumb"
import type { Metadata } from "next"

type Props = { params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal.terms" })
  return {
    title: locale === "es"
      ? "Términos de Servicio — TmpMail Correo Desechable"
      : "Terms of Service — TmpMail Disposable Email",
    description: locale === "es"
      ? "Términos de uso de TmpMail: uso aceptable, limitaciones de responsabilidad y legislación aplicable para el servicio de correo temporal."
      : "TmpMail terms of service: acceptable use, liability limitations, and applicable law for the disposable email service.",
    alternates: {
      canonical: `https://tmpmailio.com/${locale}/terms`,
      languages: {
        es: "https://tmpmailio.com/es/terms",
        en: "https://tmpmailio.com/en/terms",
        "x-default": "https://tmpmailio.com/en/terms",
      },
    },
    openGraph: {
      url: `https://tmpmailio.com/${locale}/terms`,
    },
  }
}

export default async function TermsPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "legal" })

  const sections = [
    { title: t("terms.s0Title"), body: t("terms.s0Body") },
    { title: t("terms.s1Title"), body: t("terms.s1Body") },
    { title: t("terms.s2Title"), body: t("terms.s2Body") },
    { title: t("terms.s3Title"), body: t("terms.s3Body") },
    { title: t("terms.s4Title"), body: t("terms.s4Body") },
    { title: t("terms.s5Title"), body: t("terms.s5Body") },
    { title: t("terms.s6Title"), body: t("terms.s6Body") },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema(locale, t("terms.title"), "terms")) }}
      />
      <main className="flex-1">
        <article className="max-w-2xl mx-auto py-14 px-5 md:px-10">
          <header className="mb-10 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <span
              className="font-mono text-xs tracking-widest uppercase block mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              // {locale === "es" ? "términos de uso" : "terms of use"}
            </span>
            <h1
              className="font-display font-black text-4xl tracking-tight"
              style={{ color: "var(--text-primary)", letterSpacing: "-1px" }}
            >
              {t("terms.title")}
            </h1>
            <time
              className="font-mono text-xs block mt-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("updated")}
            </time>
          </header>

          <div className="flex flex-col gap-8">
            {sections.map((s, i) => (
              <section key={i}>
                <h2
                  className="font-mono text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
                  style={{ color: "var(--accent-primary)" }}
                >
                  <span style={{ color: "var(--border-mid)" }}>//</span>
                  {s.title}
                </h2>
                <p
                  className="font-mono text-[13px] leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}
