import { getTranslations } from "next-intl/server"
import { ContactForm } from "@/components/contact/ContactForm"
import type { Metadata } from "next"

type Props = { params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal.contact" })
  return { title: t("title") }
}

export default async function ContactPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: "legal.contact" })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
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
        </article>
      </main>
    </div>
  )
}
