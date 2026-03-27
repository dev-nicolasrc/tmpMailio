import { getTranslations } from "next-intl/server"
import { buildBreadcrumbSchema } from "@/lib/schema/breadcrumb"
import type { Metadata } from "next"

type Props = { params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal.privacy" })
  return {
    title: locale === "es"
      ? "Política de Privacidad — TmpMail | Sin Datos, RGPD"
      : "Privacy Policy — TmpMail | No Data Stored, GDPR Compliant",
    description: locale === "es"
      ? "TmpMail no almacena IP, no usa cookies de rastreo y cumple con RGPD. Todos los datos se eliminan automáticamente en 10 minutos."
      : "TmpMail stores no IP addresses, uses no tracking cookies, and is fully GDPR compliant. All data is automatically deleted within 10 minutes.",
    alternates: {
      canonical: `https://tmpmailio.com/${locale}/privacy`,
      languages: {
        es: "https://tmpmailio.com/es/privacy",
        en: "https://tmpmailio.com/en/privacy",
        "x-default": "https://tmpmailio.com/en/privacy",
      },
    },
    openGraph: {
      url: `https://tmpmailio.com/${locale}/privacy`,
    },
  }
}

export default async function PrivacyPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "legal" })

  const sections = [
    { title: t("privacy.responsibleTitle"), body: t("privacy.responsibleBody") },
    { title: t("privacy.legalBasisTitle"),  body: t("privacy.legalBasisBody") },
    { title: t("privacy.s1Title"),          body: t("privacy.s1Body") },
    { title: t("privacy.s2Title"),          body: t("privacy.s2Body") },
    { title: t("privacy.cookiesTitle"),     body: t("privacy.cookiesBody") },
    { title: t("privacy.rightsTitle"),      body: t("privacy.rightsBody") },
    { title: t("privacy.s3Title"),          body: t("privacy.s3Body") },
    { title: t("privacy.internationalTitle"), body: t("privacy.internationalBody") },
    { title: t("privacy.modificationsTitle"), body: t("privacy.modificationsBody") },
    { title: t("privacy.s4Title"),          body: t("privacy.s4Body") },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema(locale, t("privacy.title"), "privacy")) }}
      />
      <main className="flex-1">
        <article className="max-w-2xl mx-auto py-14 px-5 md:px-10">
          <header className="mb-10 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <span
              className="font-mono text-xs tracking-widest uppercase block mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              // {locale === "es" ? "política de privacidad" : "privacy policy"}
            </span>
            <h1
              className="font-display font-black text-4xl tracking-tight"
              style={{ color: "var(--text-primary)", letterSpacing: "-1px" }}
            >
              {t("privacy.title")}
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
