import type { Metadata } from "next"
import { Syne, Fira_Code } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { locales } from "@/i18n"
import { buildOrganizationSchema } from "@/lib/schema/organization"
import { AdSense } from "@/components/AdSense"
import "../globals.css"

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
  display: "swap",
})

type Props = { children: React.ReactNode; params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" })
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"
  const desc = t("description")

  return {
    title: {
      default: t("title"),
      template: `%s | TmpMail`,
    },
    description: desc.length > 150 ? desc.slice(0, 147) + "..." : desc,
    keywords: locale === "es"
      ? ["correo temporal", "email desechable", "correo desechable", "email temporal gratis", "inbox temporal", "correo anónimo"]
      : ["temporary email", "disposable email", "throwaway email", "anonymous email", "temp mail", "free temporary inbox"],
    metadataBase: new URL(canonical),
    alternates: {
      canonical: `/${locale}`,
      languages: { es: "/es", en: "/en", "x-default": "/en" },
    },
    openGraph: {
      title: t("title"),
      description: desc.length > 150 ? desc.slice(0, 147) + "..." : desc,
      url: `${canonical}/${locale}`,
      siteName: "TmpMail",
      images: [{ url: `${canonical}/${locale}/opengraph-image`, width: 1200, height: 630, alt: t("title") }],
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      alternateLocale: locale === "es" ? "en_US" : "es_ES",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: desc.length > 150 ? desc.slice(0, 147) + "..." : desc,
      images: [`${canonical}/${locale}/opengraph-image`],
    },
    manifest: `/manifest.${locale}.json`,
    icons: {
      icon: [
        { url: "/icon.png", sizes: "512x512", type: "image/png" },
        { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      shortcut: "/icon.png",
    },
    other: {
      "theme-color": "#0a0a0a",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
  }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as typeof locales[number])) notFound()

  setRequestLocale(locale)
  const messages = await getMessages()
  const typedLocale = locale as "es" | "en"

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${syne.variable} ${firaCode.variable}`}
    >
      <head>
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/icon.png" type="image/png" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://api.tmpmailio.com"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://api.tmpmailio.com"} />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
      </head>
      <body suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 font-mono text-xs"
          style={{ background: "var(--accent-primary)", color: "#080808" }}
        >
          {locale === "es" ? "Saltar al contenido" : "Skip to content"}
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema(typedLocale)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://tmpmailio.com/#website",
              name: "Tmp Mail",
              alternateName: "TmpMail",
              url: "https://tmpmailio.com",
              inLanguage: ["es", "en"],
              publisher: {
                "@id": "https://tmpmailio.com/#organization",
              },
            }),
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
        <AdSense />
      </body>
    </html>
  )
}
