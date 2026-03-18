import { getTranslations } from "next-intl/server"
import type { Metadata } from "next"
import Link from "next/link"

type Props = { params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  return {
    title: locale === "es" ? "Sobre TmpMail" : "About TmpMail",
    description: locale === "es"
      ? "Conoce TmpMail: quiénes somos, cómo protegemos tu privacidad y cómo contactarnos."
      : "Learn about TmpMail: who we are, how we protect your privacy, and how to contact us.",
    alternates: {
      canonical: `https://tmpmailio.com/${locale}/about`,
      languages: {
        es: "https://tmpmailio.com/es/about",
        en: "https://tmpmailio.com/en/about",
        "x-default": "https://tmpmailio.com/en/about",
      },
    },
  }
}

export default async function AboutPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "aboutPage" })
  const tLegal = await getTranslations({ locale, namespace: "legal" })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "TmpMail", item: `https://tmpmailio.com/${locale}` },
              { "@type": "ListItem", position: 2, name: t("title"), item: `https://tmpmailio.com/${locale}/about` },
            ],
          }),
        }}
      />
      <main className="flex-1">
        <article className="max-w-2xl mx-auto py-14 px-5 md:px-10">
          <header className="mb-10 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
            <span
              className="font-mono text-xs tracking-widest uppercase block mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("label")}
            </span>
            <h1
              className="font-display font-black text-4xl tracking-tight"
              style={{ color: "var(--text-primary)", letterSpacing: "-1px" }}
            >
              {t("title")}
            </h1>
            <time
              className="font-mono text-xs block mt-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {tLegal("updated")}
            </time>
          </header>

          <div className="flex flex-col gap-8">
            {/* Who we are */}
            <section>
              <h2
                className="font-mono text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
                style={{ color: "var(--accent-primary)" }}
              >
                <span style={{ color: "var(--border-mid)" }}>//</span>
                {t("who")}
              </h2>
              <p
                className="font-mono text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("whoBody")}
              </p>
            </section>

            {/* Privacy */}
            <section>
              <h2
                className="font-mono text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
                style={{ color: "var(--accent-primary)" }}
              >
                <span style={{ color: "var(--border-mid)" }}>//</span>
                {t("privacy")}
              </h2>
              <p
                className="font-mono text-sm leading-relaxed mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("privacyBody")}
              </p>
              <Link
                href={`/${locale}/privacy`}
                className="font-mono text-xs"
                style={{ color: "var(--accent-primary)" }}
              >
                → {t("privacyLink")}
              </Link>
            </section>

            {/* Terms */}
            <section>
              <h2
                className="font-mono text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
                style={{ color: "var(--accent-primary)" }}
              >
                <span style={{ color: "var(--border-mid)" }}>//</span>
                {t("terms")}
              </h2>
              <Link
                href={`/${locale}/terms`}
                className="font-mono text-xs"
                style={{ color: "var(--accent-primary)" }}
              >
                → {t("termsLink")}
              </Link>
            </section>

            {/* Contact */}
            <section>
              <h2
                className="font-mono text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
                style={{ color: "var(--accent-primary)" }}
              >
                <span style={{ color: "var(--border-mid)" }}>//</span>
                {t("contact")}
              </h2>
              <p
                className="font-mono text-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {t("contactBody")}{" "}
                <a
                  href="mailto:contacto@tmpmailio.com"
                  className="font-mono text-sm"
                  style={{ color: "var(--accent-primary)" }}
                >
                  contacto@tmpmailio.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  )
}
