export function buildOrganizationSchema(locale: "es" | "en") {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://tmpmailio.com/#organization",
    name: "TmpMail",
    alternateName: "TmpMailio",
    url: "https://tmpmailio.com",
    description: locale === "es"
      ? "Servicio de correo electrónico temporal gratuito. Sin registro, sin datos almacenados. Privacidad real."
      : "Free temporary email service. No registration, no data stored. Real privacy.",
    foundingDate: "2024",
    logo: {
      "@type": "ImageObject",
      url: "https://tmpmailio.com/icon.png",
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
    sameAs: [
      "https://github.com/dev-nicolasrc/tmpMailio",
      // TODO: add ProductHunt URL once published
      // TODO: add Twitter/X URL once @tmpmailio is created
      // TODO: add AlternativeTo URL once listing is created
    ],
  }
}
