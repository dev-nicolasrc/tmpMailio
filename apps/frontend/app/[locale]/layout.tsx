import type { Metadata } from "next"
import { Syne, Fira_Code } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { locales } from "@/i18n"
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
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"

  return {
    title: {
      default: t("title"),
      template: `%s | TmpMail`,
    },
    description: t("description"),
    keywords: locale === "es"
      ? ["correo temporal", "email desechable", "correo desechable", "email temporal gratis", "inbox temporal", "correo fake"]
      : ["temporary email", "disposable email", "throwaway email", "fake email", "temp mail", "free temporary inbox"],
    metadataBase: new URL(canonical),
    alternates: {
      canonical: `/${locale}`,
      languages: { es: "/es", en: "/en", "x-default": "/en" },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
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
      description: t("description"),
      images: [`${canonical}/${locale}/opengraph-image`],
    },
    manifest: "/manifest.json",
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" }],
      apple: "/apple-touch-icon.png",
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${syne.variable} ${firaCode.variable}`}
    >
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://api.tmpmailio.com"} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SOCKET_URL ?? "https://api.tmpmailio.com"} />
      </head>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://tmpmailio.com/#organization",
              name: "TmpMail",
              alternateName: "TmpMailio",
              url: "https://tmpmailio.com",
              logo: {
                "@type": "ImageObject",
                url: "https://tmpmailio.com/icon-512.png",
                width: 512,
                height: 512,
              },
              contactPoint: {
                "@type": "ContactPoint",
                url: `https://tmpmailio.com/${locale}/contact`,
                email: "contacto@tmpmailio.com",
                contactType: "customer support",
                availableLanguage: ["Spanish", "English"],
              },
              privacyPolicy: `https://tmpmailio.com/${locale}/privacy`,
              termsOfService: `https://tmpmailio.com/${locale}/terms`,
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://tmpmailio.com/#website",
              name: "TmpMail",
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
      </body>
    </html>
  )
}
