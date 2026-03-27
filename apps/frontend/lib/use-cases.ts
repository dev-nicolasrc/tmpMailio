export const SLUG_PAIRS = [
  { es: "correo-temporal-para-registros-web",  en: "temporary-email-for-web-signups" },
  { es: "email-desechable-sin-registro",        en: "disposable-email-no-registration" },
  { es: "proteger-privacidad-email",            en: "protect-email-privacy" },
  { es: "correo-temporal-redes-sociales",       en: "temporary-email-social-media" },
  { es: "evitar-spam-correo-personal",          en: "avoid-email-spam" },
] as const

export function getAlternateSlug(slug: string, locale: "es" | "en"): string | null {
  const pair = SLUG_PAIRS.find(p => p[locale] === slug)
  if (!pair) return null
  return locale === "es" ? pair.en : pair.es
}

export function getSlugLocale(slug: string): "es" | "en" | null {
  for (const pair of SLUG_PAIRS) {
    if (pair.es === slug) return "es"
    if (pair.en === slug) return "en"
  }
  return null
}
