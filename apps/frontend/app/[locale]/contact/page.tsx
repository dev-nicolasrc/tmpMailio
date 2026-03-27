import { getTranslations } from "next-intl/server"
import { ContactForm } from "@/components/contact/ContactForm"
import { buildBreadcrumbSchema } from "@/lib/schema/breadcrumb"
import type { Metadata } from "next"

type Props = { params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal.contact" })
  return {
    title: locale === "es"
      ? "Contacto TmpMail — Soporte en 24–48 Horas"
      : "Contact TmpMail — Get Support in 24–48 Hours",
    description: locale === "es"
      ? "¿Tienes preguntas sobre TmpMail? Envíanos un mensaje y responderemos en 24–48 horas. Soporte para problemas técnicos, sugerencias y reportes de abuso."
      : "Have questions about TmpMail? Send us a message and we'll respond within 24–48 hours. Support for technical issues, suggestions, and abuse reports.",
    alternates: {
      canonical: `https://tmpmailio.com/${locale}/contact`,
      languages: {
        es: "https://tmpmailio.com/es/contact",
        en: "https://tmpmailio.com/en/contact",
        "x-default": "https://tmpmailio.com/en/contact",
      },
    },
    openGraph: {
      url: `https://tmpmailio.com/${locale}/contact`,
    },
  }
}

export default async function ContactPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "legal.contact" })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBreadcrumbSchema(locale, t("title"), "contact")) }}
      />
      <main className="flex-1">
        <article className="max-w-2xl mx-auto py-14 px-5 md:px-10">
          <header className="mb-10 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <span
              className="font-mono text-xs tracking-widest uppercase block mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              // contacto
            </span>
            <h1
              className="font-display font-black text-4xl tracking-tight"
              style={{ color: "var(--text-primary)", letterSpacing: "-1px" }}
            >
              {t("title")}
            </h1>
            <p
              className="font-mono text-xs block mt-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("subtitle")}
            </p>
          </header>

          <ContactForm />

          <p
            className="font-mono text-xs mt-8 pt-6"
            style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}
          >
            {locale === "es" ? "También puedes escribirnos directamente a" : "You can also email us directly at"}{" "}
            <a
              href="mailto:contacto@tmpmailio.com"
              style={{ color: "var(--accent-primary)" }}
            >
              contacto@tmpmailio.com
            </a>
          </p>
        </article>
      </main>
    </div>
  )
}
