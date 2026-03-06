import type { Metadata } from "next"
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { locales } from "@/i18n"
import "../globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" })
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

type Props = { children: React.ReactNode; params: { locale: string } }

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" })
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL(canonical),
    alternates: {
      canonical: `/${locale}`,
      languages: { es: "/es", en: "/en" },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `${canonical}/${locale}`,
      siteName: "TmpMail",
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og-image.png"],
    },
    manifest: "/manifest.json",
    icons: {
      icon: "/icons/icon-192.png",
      apple: "/icons/apple-touch-icon.png",
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
