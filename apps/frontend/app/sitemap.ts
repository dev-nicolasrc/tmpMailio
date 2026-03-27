import { MetadataRoute } from "next"
import { locales } from "@/i18n"
import { SLUG_PAIRS } from "@/lib/use-cases"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tmpmailio.com"

const DATES: Record<string, string> = {
  home:    "2026-03-26",
  privacy: "2026-03-25",
  terms:   "2026-03-19",
  contact: "2026-03-25",
  about:   "2026-03-26",
  useCase: "2026-03-26",
}

const staticSubpages = ["privacy", "terms", "contact", "about"]

export default function sitemap(): MetadataRoute.Sitemap {
  const homeEntries: MetadataRoute.Sitemap = locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: DATES.home,
    alternates: {
      languages: {
        es: `${baseUrl}/es`,
        en: `${baseUrl}/en`,
        "x-default": `${baseUrl}/en`,
      },
    },
  }))

  const subpageEntries: MetadataRoute.Sitemap = staticSubpages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}/${page}`,
      lastModified: DATES[page],
      alternates: {
        languages: {
          es: `${baseUrl}/es/${page}`,
          en: `${baseUrl}/en/${page}`,
          "x-default": `${baseUrl}/en/${page}`,
        },
      },
    }))
  )

  const useCaseEntries: MetadataRoute.Sitemap = SLUG_PAIRS.flatMap((pair) => [
    {
      url: `${baseUrl}/es/${pair.es}`,
      lastModified: DATES.useCase,
      alternates: {
        languages: {
          es: `${baseUrl}/es/${pair.es}`,
          en: `${baseUrl}/en/${pair.en}`,
          "x-default": `${baseUrl}/en/${pair.en}`,
        },
      },
    },
    {
      url: `${baseUrl}/en/${pair.en}`,
      lastModified: DATES.useCase,
      alternates: {
        languages: {
          es: `${baseUrl}/es/${pair.es}`,
          en: `${baseUrl}/en/${pair.en}`,
          "x-default": `${baseUrl}/en/${pair.en}`,
        },
      },
    },
  ])

  return [...homeEntries, ...subpageEntries, ...useCaseEntries]
}
