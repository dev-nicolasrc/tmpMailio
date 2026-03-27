export function buildWebAppSchema(locale: "es" | "en") {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `https://tmpmailio.com/${locale}/#webapp`,
    name: "TmpMail",
    alternateName: "TmpMailio",
    url: `https://tmpmailio.com/${locale}`,
    description: locale === "es"
      ? "Crea un correo desechable gratis en segundos. Sin registro, sin spam, sin datos guardados. Tu email temporal expira en 10 minutos y protege tu privacidad."
      : "Create your free disposable email in seconds. No sign-up, no spam, no data stored. Your temporary address expires in 10 minutes and protects your privacy.",
    applicationCategory: "Utilities",
    operatingSystem: "Any web browser",
    browserRequirements: "Requires JavaScript and WebSocket support",
    inLanguage: locale,
    isAccessibleForFree: true,
    image: "https://tmpmailio.com/icon.png",
    screenshot: `https://tmpmailio.com/${locale}/opengraph-image`,
    featureList: locale === "es"
      ? [
          "Generación instantánea de correo temporal",
          "Sin registro ni contraseña",
          "Recepción de correos en tiempo real vía WebSocket",
          "Soporte de adjuntos hasta 5 MB",
          "Autodestrucción en 10 minutos",
          "Código QR para compartir dirección",
        ]
      : [
          "Instant temporary email generation",
          "No registration or password",
          "Real-time email reception via WebSocket",
          "Attachment support up to 5 MB",
          "Auto-destruction in 10 minutes",
          "QR code for sharing address",
        ],
    datePublished: "2024-01-01",
    dateModified: "2026-03-26",
    publisher: {
      "@type": "Organization",
      "@id": "https://tmpmailio.com/#organization",
      name: "TmpMail",
      url: "https://tmpmailio.com",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/OnlineOnly",
    },
  }
}
