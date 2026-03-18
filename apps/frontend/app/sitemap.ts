import { MetadataRoute } from "next"
import { locales } from "@/i18n"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"

const subpages = ["privacy", "terms"]

export default function sitemap(): MetadataRoute.Sitemap {
  const homeEntries: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: new Date(),
    alternates: {
      languages: {
        es: `${baseUrl}/es`,
        en: `${baseUrl}/en`,
        "x-default": `${baseUrl}/en`,
      },
    },
  }))

  const subpageEntries: MetadataRoute.Sitemap = subpages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/${page}`,
      lastModified: new Date(),
      alternates: {
        languages: {
          es: `${baseUrl}/es/${page}`,
          en: `${baseUrl}/en/${page}`,
          "x-default": `${baseUrl}/en/${page}`,
        },
      },
    }))
  )

  return [...homeEntries, ...subpageEntries]
}
